import { describe, expect, test } from "bun:test";
import { findVersionDrift } from "./doctor";

const map = (entries: Record<string, string>) => new Map(Object.entries(entries));

describe("findVersionDrift", () => {
  test("caret ranges are checked — 1.1.2 satisfies ^1.0.0 with no warn", () => {
    // Regression: the old check skipped every range starting with "^" or "~",
    // so this exact scenario (generated package.jsons use ^) never fired.
    const warnings = findVersionDrift({ "@thexjs/core": "^1.0.0" }, map({ core: "1.1.2" }));
    expect(warnings).toEqual([]);
  });

  test("out-of-range caret dep warns — 1.0.5 does not satisfy ^1.2.0", () => {
    const warnings = findVersionDrift({ "@thexjs/core": "^1.2.0" }, map({ core: "1.0.5" }));
    expect(warnings).toEqual(["@thexjs/core: declared ^1.2.0, installed 1.0.5"]);
  });

  test("tilde ranges are checked", () => {
    const ok = findVersionDrift({ "@thexjs/core": "~1.2.0" }, map({ core: "1.2.3" }));
    const drift = findVersionDrift({ "@thexjs/core": "~1.2.0" }, map({ core: "1.3.0" }));
    expect(ok).toEqual([]);
    expect(drift).toEqual(["@thexjs/core: declared ~1.2.0, installed 1.3.0"]);
  });

  test("exact pins still drift-check both ways", () => {
    const match = findVersionDrift({ "@thexjs/cli": "1.2.3" }, map({ cli: "1.2.3" }));
    const mismatch = findVersionDrift({ "@thexjs/cli": "1.2.3" }, map({ cli: "1.2.4" }));
    expect(match).toEqual([]);
    expect(mismatch).toEqual(["@thexjs/cli: declared 1.2.3, installed 1.2.4"]);
  });

  test("wildcard and workspace ranges never warn", () => {
    const warnings = findVersionDrift(
      { "@thexjs/core": "*", "@thexjs/cli": "workspace:*" },
      map({ core: "9.9.9", cli: "0.0.1" }),
    );
    expect(warnings).toEqual([]);
  });

  test("dist-tags like latest/next never warn regardless of installed version", () => {
    const warnings = findVersionDrift(
      { "@thexjs/core": "latest", "@thexjs/cli": "next" },
      map({ core: "0.0.1", cli: "99.0.0" }),
    );
    expect(warnings).toEqual([]);
  });

  test("ignores non-@thexjs deps and missing installs", () => {
    const warnings = findVersionDrift({ react: "^19.0.0", "@thexjs/hooks": "^2.0.0" }, map({}));
    expect(warnings).toEqual([]);
  });

  test("checks all @thexjs packages in one pass", () => {
    const warnings = findVersionDrift(
      {
        "@thexjs/core": "^1.2.0",
        "@thexjs/cli": "^1.0.0",
        "@thexjs/hooks": "^1.0.0",
      },
      map({ core: "1.0.0", hooks: "1.4.0" }),
    );
    expect(warnings).toEqual(["@thexjs/core: declared ^1.2.0, installed 1.0.0"]);
  });
});
