export interface EnvValidator<T = unknown> {
  parse: (input: string | undefined) => T;
}

/**
 * Chaining combinators layered on top of a validator. `{ parse }` alone keeps
 * `EnvValidator` bivariant-friendly in user code; the combinators are exposed
 * through an intersection so generic consumers typed against `EnvValidator`
 * keep working.
 */
export interface ChainableValidator<T> {
  /**
   * Treat a missing variable as `undefined` instead of failing. A present but
   * invalid value still fails validation (e.g. `num().optional()` with "abc").
   */
  optional: () => EnvValidator<T | undefined> & ChainableValidator<T | undefined>;
  /**
   * Substitute `fallback` when the variable is missing. A present but invalid
   * value still fails validation. The resulting validator never yields
   * `undefined`, so the inferred type stays `T`.
   */
  default: (fallback: T) => EnvValidator<T> & ChainableValidator<T>;
}

type ScalarValidator<T> = EnvValidator<T> & ChainableValidator<T>;

function chainable<T>(parse: (input: string | undefined) => T): ScalarValidator<T> {
  return {
    parse,
    optional: () =>
      chainable<T | undefined>((input) => (input === undefined ? undefined : parse(input))),
    default: (fallback: T) =>
      chainable<T>((input) => (input === undefined ? fallback : parse(input))),
  };
}

export function str(): ScalarValidator<string> {
  return chainable((input) => {
    if (input === undefined) throw new Error("Expected a string, got undefined");
    return input;
  });
}

export function num(): ScalarValidator<number> {
  return chainable((input) => {
    if (input === undefined) throw new Error("Expected a number, got undefined");
    // Number("") is 0 and Number("   ") is 0 — an empty numeric env var
    // (e.g. PORT=) must not silently become 0.
    if (input.trim() === "") throw new Error(`Expected a number, got "${input}"`);
    const n = Number(input);
    if (Number.isNaN(n)) throw new Error(`Expected a number, got "${input}"`);
    return n;
  });
}

export function bool(): ScalarValidator<boolean> {
  return chainable((input) => {
    if (input === undefined) throw new Error("Expected a boolean, got undefined");
    if (input === "true" || input === "1") return true;
    if (input === "false" || input === "0") return false;
    throw new Error(`Expected a boolean, got "${input}"`);
  });
}

export function oneOf<T extends string>(values: readonly T[]): ScalarValidator<T> {
  return chainable((input) => {
    if (input === undefined) throw new Error(`Expected one of ${values.join(", ")}`);
    if (!values.includes(input as T)) {
      throw new Error(`Expected one of ${values.join(", ")}, got "${input}"`);
    }
    return input as T;
  });
}

export function url(): ScalarValidator<string> {
  return chainable((input) => {
    if (input === undefined) throw new Error("Expected a URL, got undefined");
    try {
      new URL(input);
      return input;
    } catch (_) {
      throw new Error(`Expected a valid URL, got "${input}"`);
    }
  });
}
