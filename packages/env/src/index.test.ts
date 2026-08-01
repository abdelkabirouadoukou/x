import { describe, expect, test } from "bun:test";
import { bool, createEnv, num, oneOf, str, url } from "./index";
import { DEFAULT_CLIENT_PREFIX } from "./index";

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
});
