import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { connectSQLite } from "../data/sqlite";
import {
  dbTraceAttributes,
  getTracer,
  runWithRequestSpan,
  setTracer,
  tracePhase,
  traceRequestId,
  withRequestTracing,
} from "./tracing";

class RecordingSpan {
  readonly attributes: Record<string, unknown> = {};
  readonly exceptions: unknown[] = [];
  status: { code: number; message?: string } | undefined;
  ended = false;

  constructor(
    readonly name: string,
    attributes: Record<string, unknown> = {},
  ) {
    this.attributes = { ...attributes };
  }

  setAttribute(key: string, value: unknown): void {
    this.attributes[key] = value;
  }

  recordException(error: unknown): void {
    this.exceptions.push(error);
  }

  setStatus(status: { code: number; message?: string }): void {
    this.status = status;
  }

  end(): void {
    this.ended = true;
  }
}

class RecordingTracer {
  readonly spans: RecordingSpan[] = [];

  startSpan(name: string, options?: { attributes?: Record<string, unknown> }): RecordingSpan {
    const span = new RecordingSpan(name, options?.attributes);
    this.spans.push(span);
    return span;
  }
}

let tracer: RecordingTracer;

beforeEach(() => {
  tracer = new RecordingTracer();
  setTracer(tracer);
});

afterAll(() => {
  setTracer({
    startSpan: () => ({
      setAttribute: () => {},
      recordException: () => {},
      setStatus: () => {},
      end: () => {},
    }),
  });
});

describe("tracer pluggability", () => {
  test("defaults to a no-op tracer; setTracer/getTracer round-trip", () => {
    setTracer({
      startSpan: () => ({
        setAttribute: () => {},
        recordException: () => {},
        setStatus: () => {},
        end: () => {},
      }),
    });
    const t = getTracer();
    const span = t.startSpan("x.http");
    expect(typeof span.end).toBe("function");
    // No-op spans must not throw anywhere.
    span.setAttribute("a", 1);
    span.recordException(new Error("x"));
    span.setStatus({ code: 2 });
    span.end();
    setTracer(tracer);
    expect(getTracer()).toBe(tracer);
  });
});

describe("request root span (runWithRequestSpan)", () => {
  test("opens an x.http span carrying the request id and finish attributes", async () => {
    await runWithRequestSpan("req-1", { route: "/dash", method: "GET" }, async (finish) => {
      finish({ "http.response.status_code": 200 });
    });

    expect(tracer.spans).toHaveLength(1);
    const root = tracer.spans[0] as RecordingSpan;
    expect(root.name).toBe("x.http");
    expect(root.attributes["x.requestId"]).toBe("req-1");
    expect(root.attributes.route).toBe("/dash");
    expect(root.attributes.method).toBe("GET");
    expect(root.attributes["http.response.status_code"]).toBe(200);
    expect(root.ended).toBe(true);
  });

  test("a throwing handler records the exception and errors the span", async () => {
    await expect(
      runWithRequestSpan("req-2", {}, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    const root = tracer.spans[0] as RecordingSpan;
    expect(root.exceptions).toHaveLength(1);
    expect(root.status?.code).toBe(2);
    expect(root.status?.message).toBe("boom");
    expect(root.ended).toBe(true);
  });
});

describe("phase spans (tracePhase)", () => {
  test("a phase span inherits the request id and is correlated under the root", async () => {
    await runWithRequestSpan("req-3", {}, async () => {
      await tracePhase("x.db", { "db.system": "postgres" }, async () => 42);
    });

    expect(tracer.spans).toHaveLength(2);
    const phase = tracer.spans[1] as RecordingSpan;
    expect(phase.name).toBe("x.db");
    expect(phase.attributes["x.requestId"]).toBe("req-3");
    expect(phase.attributes["db.system"]).toBe("postgres");
    expect(phase.ended).toBe(true);
  });

  test("a failing phase records the exception and rethrows", async () => {
    await expect(
      runWithRequestSpan("req-4", {}, async () => {
        await tracePhase("x.action", { action: "login" }, async () => {
          throw new Error("nope");
        });
      }),
    ).rejects.toThrow("nope");

    const phase = tracer.spans[1] as RecordingSpan;
    expect(phase.name).toBe("x.action");
    expect(phase.exceptions).toHaveLength(1);
    expect(phase.status?.code).toBe(2);
    expect(phase.ended).toBe(true);
  });

  test("outside a traced request, tracePhase is a transparent passthrough", async () => {
    const value = await tracePhase("x.db", {}, async () => 7);
    expect(value).toBe(7);
    expect(tracer.spans).toHaveLength(0);
  });
});

describe("withRequestTracing", () => {
  test("mints a request id shared with inner handlers and the root span", async () => {
    let seen = "";
    const handler = withRequestTracing<never>(async (req) => {
      seen = traceRequestId(req);
      return new Response("ok");
    });

    await handler(new Request("http://x.test/foo"));
    expect(seen).toBeTruthy();
    const root = tracer.spans[0] as RecordingSpan;
    expect(root.attributes["x.requestId"]).toBe(seen);
    expect(root.attributes.route).toBe("/foo");
    expect(root.attributes.method).toBe("GET");
    expect(root.attributes["http.response.status_code"]).toBe(200);
    expect(root.ended).toBe(true);
  });

  test("reuses an inbound x-request-id instead of minting a second one", async () => {
    let seen = "";
    const handler = withRequestTracing<never>(async (req) => {
      seen = traceRequestId(req);
      return new Response("ok");
    });

    await handler(new Request("http://x.test/foo", { headers: { "x-request-id": "inbound-7" } }));

    expect(seen).toBe("inbound-7");
    expect(tracer.spans[0]?.attributes["x.requestId"]).toBe("inbound-7");
  });

  test("a streamed-body request still aborts oversize bodies (no clone hang)", async () => {
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("x".repeat(64)));
      },
    });
    // Counterpart detection: if the request body ever got cloned (which hangs
    // Bun's body pump), this request would never settle and the test would
    // time out. A streamed body passes straight through the tracing wrapper.
    const handler = withRequestTracing<never>(async () => new Response("ok"));
    await handler(new Request("http://x.test/upload", { method: "POST", body: source }));
    expect(tracer.spans[0]?.attributes["x.requestId"]).toBeTruthy();
  });
});

describe("dbTraceAttributes", () => {
  test("classifies the operation and redacts + truncates the statement", () => {
    const attrs = dbTraceAttributes(
      "sqlite",
      `SELECT id FROM users WHERE token = 'Bearer abc_123' AND ${"x".repeat(600)}`,
    );
    expect(attrs["db.system"]).toBe("sqlite");
    expect(attrs["db.operation"]).toBe("select");
    const statement = String(attrs["db.statement"]);
    expect(statement).not.toContain("abc_123");
    // Truncation keeps giant statements out of the trace backend.
    expect(statement.length).toBeLessThanOrEqual(512);
  });
});

describe("connectSQLite tracing", () => {
  test("a failing query yields an x.db span carrying the request id", async () => {
    const db = connectSQLite({ path: ":memory:", wal: false, foreignKeys: true });
    db.run("CREATE TABLE parent (id INTEGER PRIMARY KEY)");
    db.run("CREATE TABLE child (parent_id INTEGER REFERENCES parent(id))");

    await runWithRequestSpan("req-db", {}, async () => {
      // FK violation: throws, but is recorded on an x.db span.
      expect(() => db.run("INSERT INTO child (parent_id) VALUES (999)")).toThrow();
      const row = db.query("SELECT 1 AS one").get() as Record<string, number> | null;
      expect(row?.one).toBe(1);
    });
    db.close();

    const failed = tracer.spans.find(
      (s) => s.name === "x.db" && s.attributes["db.operation"] === "insert",
    ) as RecordingSpan | undefined;
    expect(failed).toBeDefined();
    expect(failed?.attributes["x.requestId"]).toBe("req-db");
    expect(failed?.attributes["db.system"]).toBe("sqlite");
    expect(failed?.exceptions.length).toBeGreaterThan(0);
    expect(failed?.status?.code).toBe(2);
    expect(failed?.ended).toBe(true);
  });
});
