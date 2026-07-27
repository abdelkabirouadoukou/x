export interface EnvValidator<T = unknown> {
  parse: (input: string | undefined) => T;
}

export function str(): EnvValidator<string> {
  return {
    parse(input) {
      if (input === undefined) throw new Error("Expected a string, got undefined");
      return input;
    },
  };
}

export function num(): EnvValidator<number> {
  return {
    parse(input) {
      if (input === undefined) throw new Error("Expected a number, got undefined");
      const n = Number(input);
      if (Number.isNaN(n)) throw new Error(`Expected a number, got "${input}"`);
      return n;
    },
  };
}

export function bool(): EnvValidator<boolean> {
  return {
    parse(input) {
      if (input === undefined) throw new Error("Expected a boolean, got undefined");
      if (input === "true" || input === "1") return true;
      if (input === "false" || input === "0") return false;
      throw new Error(`Expected a boolean, got "${input}"`);
    },
  };
}

export function oneOf<T extends string>(values: readonly T[]): EnvValidator<T> {
  return {
    parse(input) {
      if (input === undefined) throw new Error(`Expected one of ${values.join(", ")}`);
      if (!values.includes(input as T)) {
        throw new Error(`Expected one of ${values.join(", ")}, got "${input}"`);
      }
      return input as T;
    },
  };
}

export function url(): EnvValidator<string> {
  return {
    parse(input) {
      if (input === undefined) throw new Error("Expected a URL, got undefined");
      try {
        new URL(input);
        return input;
      } catch (_) {
        throw new Error(`Expected a valid URL, got "${input}"`);
      }
    },
  };
}
