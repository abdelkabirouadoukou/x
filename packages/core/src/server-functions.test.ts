import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  getServerFunctionHandler,
  registerServerFunctions,
  resetServerFunctions,
} from "./server-functions";

/**
 * Runtime coverage for server actions (the POST /__x/actions/* pipeline).
 * phase3.test.ts only asserts the *generated client* code; this exercises the
 * actual request handler: route matching against registered actions, CSRF
 * enforcement, argument parsing, error handling, and 404/400 responses.
 */

function post(path: string, init: RequestInit = {}): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { origin: "http://localhost", "Content-Type": "application/json" },
    ...init,
  });
}

const okFn = async (name: string) => ({ greeting: `hello ${name}` });
const throwingFn = async () => {
  throw new Error("boom");
};

beforeEach(() => {
  resetServerFunctions();
});

afterEach(() => {
  resetServerFunctions();
});

describe("registerServerFunctions", () => {
  test("merges functions into an existing route entry", () => {
    registerServerFunctions("/greet", [], { a: okFn });
    registerServerFunctions("/greet", [], { b: okFn });
    const handler = getServerFunctionHandler();
    const res = handler(post("/__x/actions/greet/b"));
    expect(res).not.toBeNull();
  });

  test("separate route paths stay separate", async () => {
    registerServerFunctions("/a", [], { go: okFn });
    registerServerFunctions("/b", [], { go: okFn });
    const handler = getServerFunctionHandler();
    const res = await handler(post("/__x/actions/b/go", { body: JSON.stringify(["B"]) }));
    expect(res?.status).toBe(200);
    expect(await res?.json()).toEqual({ greeting: "hello B" });
  });
});

describe("server function dispatch", () => {
  test("runs a registered action and returns its JSON result", async () => {
    registerServerFunctions("/greet", [], { greet: okFn });
    const handler = getServerFunctionHandler();
    const res = await handler(post("/__x/actions/greet/greet", { body: JSON.stringify(["Ada"]) }));
    expect(res?.status).toBe(200);
    expect(await res?.json()).toEqual({ greeting: "hello Ada" });
  });

  test("passes route params through to the action path", async () => {
    registerServerFunctions("/workspace/:id", ["id"], {
      ping: async () => "pong",
    });
    const handler = getServerFunctionHandler();
    const res = await handler(post("/__x/actions/workspace/w-42/ping", { body: "[]" }));
    expect(res?.status).toBe(200);
    expect(await res?.json()).toBe("pong");
  });

  test("wraps a non-array JSON body as a single arg", async () => {
    registerServerFunctions("/echo", [], {
      echo: async (v: unknown) => v,
    });
    const handler = getServerFunctionHandler();
    const res = await handler(post("/__x/actions/echo/echo", { body: JSON.stringify(7) }));
    expect(await res?.json()).toBe(7);
  });

  test("returns 404 for an unregistered action name", async () => {
    registerServerFunctions("/greet", [], { greet: okFn });
    const handler = getServerFunctionHandler();
    const res = await handler(post("/__x/actions/greet/nope"));
    expect(res?.status).toBe(404);
    expect(await res?.text()).toBe("Function not found");
  });

  test("returns 404 when no registered route matches", async () => {
    const handler = getServerFunctionHandler();
    const res = await handler(post("/__x/actions/unknown/whatever"));
    expect(res?.status).toBe(404);
  });

  test("returns 400 for an invalid JSON body", async () => {
    registerServerFunctions("/greet", [], { greet: okFn });
    const handler = getServerFunctionHandler();
    const res = await handler(post("/__x/actions/greet/greet", { body: "{not json" }));
    expect(res?.status).toBe(400);
    expect(await res?.text()).toBe("Invalid request body");
  });

  test("returns 500 with the error message when an action throws", async () => {
    registerServerFunctions("/fail", [], { explode: throwingFn });
    const handler = getServerFunctionHandler();
    const res = await handler(post("/__x/actions/fail/explode", { body: "[]" }));
    expect(res?.status).toBe(500);
    expect(await res?.text()).toBe("boom");
  });

  test("ignores non-POST requests", async () => {
    registerServerFunctions("/greet", [], { greet: okFn });
    const handler = getServerFunctionHandler();
    const res = await handler(
      new Request("http://localhost/__x/actions/greet/greet", {
        method: "GET",
        headers: { origin: "http://localhost" },
      }),
    );
    expect(res).toBeNull();
  });

  test("ignores requests outside /__x/actions/*", async () => {
    registerServerFunctions("/greet", [], { greet: okFn });
    const handler = getServerFunctionHandler();
    const res = await handler(post("/somewhere/else"));
    expect(res).toBeNull();
  });
});

describe("CSRF on server actions", () => {
  test("rejects a POST from a cross-site origin", async () => {
    registerServerFunctions("/greet", [], { greet: okFn });
    const handler = getServerFunctionHandler();
    const res = await handler(
      new Request("http://localhost/__x/actions/greet/greet", {
        method: "POST",
        headers: { origin: "https://evil.example" },
      }),
    );
    expect(res?.status).toBe(403);
  });

  test("rejects a POST with no Origin or Referer", async () => {
    registerServerFunctions("/greet", [], { greet: okFn });
    const handler = getServerFunctionHandler();
    const res = await handler(
      new Request("http://localhost/__x/actions/greet/greet", { method: "POST" }),
    );
    expect(res?.status).toBe(403);
  });

  test("accepts a same-origin POST", async () => {
    registerServerFunctions("/greet", [], { greet: okFn });
    const handler = getServerFunctionHandler();
    const res = await handler(post("/__x/actions/greet/greet", { body: JSON.stringify(["Ada"]) }));
    expect(res?.status).toBe(200);
  });

  test("csrf disabled permits an origin-less POST", async () => {
    registerServerFunctions("/greet", [], { greet: okFn });
    const handler = getServerFunctionHandler({ disabled: true });
    const res = await handler(
      new Request("http://localhost/__x/actions/greet/greet", {
        method: "POST",
        body: "[]",
      }),
    );
    expect(res?.status).toBe(200);
  });
});
