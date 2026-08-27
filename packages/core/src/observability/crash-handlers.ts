/**
 * Process-level crash handlers for the Bun server path.
 *
 * Request-scoped errors are contained inside `createApp`'s fetch boundary
 * (route handlers, API handlers, server actions). What still escapes to the
 * event loop is a crash *outside* the request lifecycle — a throw during
 * module eval, a rejected promise from a background sweep, a timer callback —
 * which would otherwise take the whole process down with it.
 *
 * These handlers report the crash through the configured error reporter so an
 * operator sees it, rather than dying silently (or staying up silently with no
 * trace of what happened).
 *
 * A throw that escapes to the event loop (module eval, background sweep,
 * native callback, timer) leaves module-scope singletons in an undefined
 * state, so the process must not keep serving corrupted traffic. By default
 * an `uncaughtException` fails fast (`exitOnCrash` defaults `true`) so the
 * orchestrator (systemd/K8s) restarts the box clean. Unhandled rejections are
 * usually recoverable and stay survivable by default.
 */

import { reportException } from "./monitoring";

export interface ProcessCrashHandlerOptions {
  /** Phase tag forwarded to the error reporter. Defaults to "api". */
  phase?: "ssr" | "action" | "api" | "loader";
  /**
   * When true, `process.exit(1)` after an uncaught exception. Defaults to
   * `true` — an uncaughtException can leave process singletons half-mutated,
   * so it must fail fast for the orchestrator to restart clean. Set `false`
   * to keep serving after reporting.
   */
  exitOnCrash?: boolean;
  /**
   * When true, `process.exit(1)` after an unhandled rejection. Defaults to
   * `false` — an unhandledRejection is usually a lone async failure the
   * process can survive.
   */
  exitOnUnhandledRejection?: boolean;
}

/** Registers `uncaughtException`/`unhandledRejection` handlers; returns a disposer. */
export function installProcessCrashHandlers(options: ProcessCrashHandlerOptions = {}): () => void {
  const phase = options.phase ?? "api";
  const exitOnUncaughtException = options.exitOnCrash ?? true;
  const exitOnUnhandledRejection = options.exitOnUnhandledRejection ?? false;

  const onUncaughtException = (error: Error) => {
    console.error("[x] uncaught exception:", error);
    reportException(error, { phase });
    if (exitOnUncaughtException) process.exit(1);
  };

  const onUnhandledRejection = (reason: unknown) => {
    console.error("[x] unhandled rejection:", reason);
    reportException(reason, { phase });
    if (exitOnUnhandledRejection) process.exit(1);
  };

  process.on("uncaughtException", onUncaughtException);
  process.on("unhandledRejection", onUnhandledRejection);

  return () => {
    process.off("uncaughtException", onUncaughtException);
    process.off("unhandledRejection", onUnhandledRejection);
  };
}
