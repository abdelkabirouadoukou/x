import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { connectPostgres } from "./postgres";

// `connectPostgres` builds its client via `new Bun.SQL(...)` at call time, so we
// can stub the constructor to (a) inspect the resolved connection options and
// (b) simulate a database that is down for the first N attempts. This keeps the
// retry/backoff and TLS behavior pinned without needing a live Postgres. The
// retry probe uses `SELECT 1`, so fake clients count only that query as a probe.
interface CapturedOptions {
  url: URL;
  max: number;
  tls?: { ca?: string };
}

const realSQL = Bun.SQL;
let captured: CapturedOptions | undefined;
let probeCalls = 0;
let retryLog: number[] = [];
let failAlways = false;
let failAttempts = 0;
const CONN_ERROR = new Error("connection refused (ECONNREFUSED)");

class FakeSQL {
  constructor(options: CapturedOptions) {
    captured = options;
  }
  async unsafe(query: string): Promise<unknown> {
    if (query === "SELECT 1") {
      probeCalls++;
      if (failAlways || probeCalls <= failAttempts) {
        throw CONN_ERROR;
      }
    }
    return { ok: true };
  }
}

function installFake() {
  probeCalls = 0;
  retryLog = [];
  captured = undefined;
  failAlways = false;
  failAttempts = 0;
  (Bun as { SQL: unknown }).SQL = FakeSQL as unknown as typeof Bun.SQL;
}

function restoreSQL() {
  (Bun as { SQL: unknown }).SQL = realSQL;
}

beforeEach(() => {
  process.env.NODE_ENV = "test";
  installFake();
});

afterEach(() => {
  restoreSQL();
  process.env.NODE_ENV = "test";
});

afterAll(() => {
  restoreSQL();
});

describe("connectPostgres retry/backoff", () => {
  test("a connection failure triggers retries instead of an immediate throw", async () => {
    failAttempts = 2;
    const started = Date.now();
    const client = connectPostgres({
      url: "postgres://user:pass@localhost:5432/db",
      retryAttempts: 3,
      retryDelayMs: 40,
      onRetry: (attempt) => retryLog.push(attempt),
    });
    await expect(client.unsafe("SELECT * FROM users")).resolves.toBeDefined();
    const elapsed = Date.now() - started;
    expect(probeCalls).toBe(3); // two failed probes + one successful
    expect(retryLog).toEqual([1, 2]);
    expect(elapsed).toBeGreaterThanOrEqual(120); // 40ms + 80ms backoff
  });

  test("respects the max-retry ceiling and surfaces the underlying error", async () => {
    failAlways = true;
    const client = connectPostgres({
      url: "postgres://user:pass@localhost:5432/db",
      retryAttempts: 3,
      retryDelayMs: 1,
      onRetry: (attempt) => retryLog.push(attempt),
    });
    await expect(client.unsafe("SELECT * FROM users")).rejects.toBe(CONN_ERROR);
    expect(probeCalls).toBe(3);
    expect(retryLog).toEqual([1, 2]);
  });

  test("retryAttempts: 0 connects without probing or retrying", async () => {
    failAlways = true;
    const client = connectPostgres({
      url: "postgres://user:pass@localhost:5432/db",
      retryAttempts: 0,
    });
    await expect(client.unsafe("SELECT * FROM users")).resolves.toBeDefined();
    expect(probeCalls).toBe(0);
  });

  test("a healthy connection succeeds on the first attempt", async () => {
    const client = connectPostgres({
      url: "postgres://user:pass@localhost:5432/db",
      onRetry: (attempt) => retryLog.push(attempt),
    });
    await expect(client.unsafe("SELECT * FROM users")).resolves.toBeDefined();
    expect(probeCalls).toBe(1);
    expect(retryLog).toEqual([]);
  });
});

describe("connectPostgres TLS enforcement", () => {
  test("production mode defaults to sslmode=require", () => {
    process.env.NODE_ENV = "production";
    connectPostgres({ url: "postgres://user:pass@localhost:5432/db" });
    expect(captured?.url.searchParams.get("sslmode")).toBe("require");
  });

  test("non-production mode defaults to no sslmode", () => {
    connectPostgres({ url: "postgres://user:pass@localhost:5432/db" });
    expect(captured?.url.searchParams.get("sslmode")).toBeNull();
  });

  test("ssl: false forces the policy off even in production", () => {
    process.env.NODE_ENV = "production";
    connectPostgres({ url: "postgres://user:pass@localhost:5432/db", ssl: false });
    expect(captured?.url.searchParams.get("sslmode")).toBeNull();
  });

  test("ssl: true maps to sslmode=require", () => {
    connectPostgres({ url: "postgres://user:pass@localhost:5432/db", ssl: true });
    expect(captured?.url.searchParams.get("sslmode")).toBe("require");
  });

  test('ssl: "no-verify" is an alias for require', () => {
    connectPostgres({ url: "postgres://user:pass@localhost:5432/db", ssl: "no-verify" });
    expect(captured?.url.searchParams.get("sslmode")).toBe("require");
  });

  test("ssl: verify-full with a CA attaches the certificate", () => {
    connectPostgres({
      url: "postgres://user:pass@localhost:5432/db",
      ssl: "verify-full",
      ca: "-----BEGIN CERTIFICATE-----",
    });
    expect(captured?.url.searchParams.get("sslmode")).toBe("verify-full");
    expect(captured?.tls?.ca).toBe("-----BEGIN CERTIFICATE-----");
  });

  test("a CA without a verified mode is not attached", () => {
    connectPostgres({
      url: "postgres://user:pass@localhost:5432/db",
      ssl: false,
      ca: "-----BEGIN CERTIFICATE-----",
    });
    expect(captured?.tls).toBeUndefined();
  });

  test("pool sizing passes through to Bun.SQL", () => {
    connectPostgres({ url: "postgres://user:pass@localhost:5432/db", max: 20 });
    expect(captured?.max).toBe(20);
  });
});
