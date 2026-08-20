import { describe, expect, test } from "bun:test";
import { bool, createEnv, DEFAULT_CLIENT_PREFIX, num, oneOf, str, url } from "./index";

/**
 * The env package is the type-safe boundary between `.env` and application
 * config. Before this file, it had zero tests despite being a public package
 * surface. These pin validator behavior and the aggregate error reporting.
 */

describe("validators", () => {
  test("str returns the value and rejects undefined", () => {
    expect(str().parse("hello")).toBe("hello");
    expect(() => str().parse(undefined)).toThrow("Expected a string");
  });

  test("num parses numeric strings and rejects NaN", () => {
    expect(num().parse("42")).toBe(42);
    expect(() => num().parse(undefined)).toThrow("Expected a number");
    expect(() => num().parse("abc")).toThrow('got "abc"');
  });

  test("bool accepts true/false and 1/0", () => {
    expect(bool().parse("true")).toBe(true);
    expect(bool().parse("1")).toBe(true);
    expect(bool().parse("false")).toBe(false);
    expect(bool().parse("0")).toBe(false);
    expect(() => bool().parse("yes")).toThrow("Expected a boolean");
  });

  test("oneOf accepts only listed values", () => {
    const env = oneOf(["dev", "prod"] as const);
    expect(env.parse("prod")).toBe("prod");
    expect(() => env.parse("stage")).toThrow("Expected one of");
  });

  test("url validates URL shape", () => {
    expect(url().parse("https://example.com")).toBe("https://example.com");
    expect(() => url().parse("not a url")).toThrow("Expected a valid URL");
  });

  test("optional() turns a missing var into undefined", () => {
    expect(str().optional().parse(undefined)).toBeUndefined();
    expect(num().optional().parse(undefined)).toBeUndefined();
    expect(num().optional().parse("42")).toBe(42);
  });

  test("optional() still validates present values", () => {
    expect(() => num().optional().parse("abc")).toThrow('got "abc"');
    expect(() => bool().optional().parse("yes")).toThrow("Expected a boolean");
  });

  test("default() substitutes a fallback for a missing var", () => {
    expect(num().default(3000).parse(undefined)).toBe(3000);
    expect(str().default("dev").parse(undefined)).toBe("dev");
  });

  test("default() still validates present values", () => {
    expect(num().default(3000).parse("8080")).toBe(8080);
    expect(() => num().default(3000).parse("abc")).toThrow('got "abc"');
  });

  test("optional() composes with default()", () => {
    const v = num().optional().default(0);
    // compile-time assertion: default() narrows away `undefined`
    const narrowed: number = v.parse(undefined);
    expect(narrowed).toBe(0);
    expect(v.parse("7")).toBe(7);
  });
});

describe("createEnv", () => {
  test("parses server vars and strips them to typed values", () => {
    const env = createEnv({
      server: {
        PORT: num(),
        NODE_ENV: oneOf(["development", "production"] as const),
      },
      runtimeEnv: { PORT: "8080", NODE_ENV: "production" },
    });
    expect(env.PORT).toBe(8080);
    expect(env.NODE_ENV).toBe("production");
  });

  test("throws an aggregate error listing every failed key", () => {
    expect(() =>
      createEnv({
        server: {
          PORT: num(),
          SECRET: str(),
        },
        runtimeEnv: { PORT: "not-a-number" },
      }),
    ).toThrow(/server\.PORT: Expected a number/);
    expect(() =>
      createEnv({
        server: {
          PORT: num(),
          SECRET: str(),
        },
        runtimeEnv: { PORT: "not-a-number" },
      }),
    ).toThrow(/server\.SECRET: Expected a string/);
  });

  test("missing server vars fail validation", () => {
    expect(() =>
      createEnv({
        server: { REQUIRED: str() },
        runtimeEnv: {},
      }),
    ).toThrow(/REQUIRED: Expected a string/);
  });

  test("client vars must be prefixed with the client prefix", () => {
    expect(() =>
      createEnv({
        client: { API_URL: str() },
        runtimeEnv: { API_URL: "https://example.com" },
      }),
    ).toThrow(/client\.API_URL: must start with prefix "THEXJS_PUBLIC_"/);
  });

  test("prefixed client vars parse successfully", () => {
    const env = createEnv({
      client: { THEXJS_PUBLIC_API_URL: url() },
      runtimeEnv: { THEXJS_PUBLIC_API_URL: "https://api.example.com" },
    });
    expect(env.THEXJS_PUBLIC_API_URL).toBe("https://api.example.com");
  });

  test("honors a custom client prefix", () => {
    const env = createEnv({
      clientPrefix: "VITE_",
      client: { VITE_API_URL: url() },
      runtimeEnv: { VITE_API_URL: "https://api.example.com" },
    });
    expect(env.VITE_API_URL).toBe("https://api.example.com");
  });

  test("default client prefix matches the core compiler boundary", () => {
    // This constant is duplicated on purpose in @thexjs/core's env-isolation;
    // if they drift, client-exposed vars would pass validation but fail the
    // production build (or leak). Pin the contract here.
    expect(DEFAULT_CLIENT_PREFIX).toBe("THEXJS_PUBLIC_");
  });

  test("optional() server vars pass without being set", () => {
    const env = createEnv({
      server: {
        SENTRY_DSN: url().optional(),
        PORT: num().optional(),
      },
      runtimeEnv: { PORT: "8080" },
    });
    expect(env.SENTRY_DSN).toBeUndefined();
    expect(env.PORT).toBe(8080);
  });

  test("default() server vars yield the fallback when unset", () => {
    const env = createEnv({
      server: {
        PORT: num().default(3000),
        NODE_ENV: oneOf(["development", "production"] as const).default("development"),
      },
      runtimeEnv: {},
    });
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe("development");
  });

  test("optional() client vars can be omitted and typed as undefined", () => {
    const env = createEnv({
      client: { THEXJS_PUBLIC_ANALYTICS_ID: str().optional() },
      runtimeEnv: {},
    });
    expect(env.THEXJS_PUBLIC_ANALYTICS_ID).toBeUndefined();
  });

  test("defaulted vars still fail on invalid present values", () => {
    expect(() =>
      createEnv({
        server: { PORT: num().default(3000) },
        runtimeEnv: { PORT: "not-a-number" },
      }),
    ).toThrow(/server\.PORT: Expected a number/);
  });
});
