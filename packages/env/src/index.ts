import type { EnvValidator } from "./validators";

export { str, num, bool, oneOf, url } from "./validators";
export type { EnvValidator } from "./validators";

interface EnvSchemaInput {
  server?: Record<string, EnvValidator>;
  clientPrefix?: string;
  client?: Record<string, EnvValidator>;
  runtimeEnv: Record<string, string | undefined>;
}

type InferServer<T> = {
  [K in keyof T]: T[K] extends EnvValidator<infer V> ? V : never;
};

type InferClient<T, P extends string> = {
  [K in keyof T as K extends `${P}${string}` ? K : never]: T[K] extends EnvValidator<infer V>
    ? V
    : never;
};

export function createEnv<T extends EnvSchemaInput>(
  schema: T,
): InferServer<T["server"]> &
  InferClient<T["client"], T["clientPrefix"] extends string ? T["clientPrefix"] : ""> {
  const errors: string[] = [];
  const result: Record<string, unknown> = {};

  if (schema.server) {
    for (const [key, validator] of Object.entries(schema.server)) {
      try {
        result[key] = validator.parse(schema.runtimeEnv[key]);
      } catch (err) {
        errors.push(`server.${key}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  if (schema.client) {
    const prefix = schema.clientPrefix ?? "";
    for (const [key, validator] of Object.entries(schema.client)) {
      if (!key.startsWith(prefix)) {
        errors.push(`client.${key}: must start with prefix "${prefix}"`);
        continue;
      }
      try {
        result[key] = validator.parse(schema.runtimeEnv[key]);
      } catch (err) {
        errors.push(`client.${key}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n  ${errors.join("\n  ")}`);
  }

  return result as never;
}
