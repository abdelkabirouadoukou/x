import type { Database } from "bun:sqlite";
import { dbTraceAttributes, tracePhaseSync } from "../observability/tracing";

export interface SQLiteOptions {
  path?: string;
  wal?: boolean;
  foreignKeys?: boolean;
}

// `bun:sqlite` is a Bun builtin. Loading it through `import.meta.require`
// keeps the import lazy so this module (and anything that imports
// `@thexjs/core/data`) still loads on non-Bun runtimes like Vercel's Node.js
// functions — the error only surfaces if someone actually calls
// connectSQLite() there. (Bun's `import.meta.require` also keeps this module
// bundleable for the browser: no top-level `node:module` import.)
const require = import.meta.require;

function loadBunSQLite(): { Database: typeof Database } {
  try {
    return require("bun:sqlite") as { Database: typeof Database };
  } catch {
    throw new Error(
      "connectSQLite requires the Bun runtime (bun:sqlite). Use connectPostgres on non-Bun runtimes like Vercel.",
    );
  }
}

/**
 * Wraps a `bun:sqlite` Database so each statement execution produces an
 * `x.db` span attributed with the driver, statement and current request id.
 * `bun:sqlite` is synchronous, so this uses the sync tracing path — a no-op
 * outside a traced request, and transparent otherwise.
 */
function traceSQLite(db: Database): Database {
  return new Proxy(db, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      if (prop === "query") {
        return (sql: string) => traceStatement(value.call(target, sql), sql);
      }
      if (prop === "run" || prop === "execute") {
        // run/execute are synchronous; caller-visible behavior (including
        // thrown errors, e.g. FK violations) is preserved exactly.
        return (...args: unknown[]) =>
          tracePhaseSync("x.db", dbTraceAttributes("sqlite", String(args[0] ?? "")), () =>
            value.apply(target, args),
          );
      }
      return value.bind(target);
    },
  });
}

/** Wraps one statement so `.all/.get/.run/.values` are traced individually. */
function traceStatement(statement: unknown, sql: string): unknown {
  if (statement === null || typeof statement !== "object") return statement;
  return new Proxy(statement as object, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      if (prop === "all" || prop === "get" || prop === "run" || prop === "values") {
        return (...args: unknown[]) =>
          tracePhaseSync("x.db", dbTraceAttributes("sqlite", sql), () => value.apply(target, args));
      }
      return value.bind(target);
    },
  });
}

export function connectSQLite(options?: SQLiteOptions): Database {
  const { Database: DB } = loadBunSQLite();
  const db = new DB(options?.path ?? "data/dev.db");
  if (options?.wal !== false) {
    db.run("PRAGMA journal_mode = WAL");
  }
  if (options?.foreignKeys !== false) {
    db.run("PRAGMA foreign_keys = ON");
  }
  return traceSQLite(db);
}
