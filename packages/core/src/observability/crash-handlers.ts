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
 * trace of what happened). By default the process keeps serving; set
 * `exitOnCrash` to opt into crash-on-error semantics (e.g. when running under
 * a supervisor like systemd/K8s that restarts the box).
 */

import { reportException } from "./monitoring";

export interface ProcessCrashHandlerOptions {
  /** Phase tag forwarded to the error reporter. Defaults to "api". */
  phase?: "ssr" | "action" | "api" | "loader";
  /** When true, `process.exit(1)` after reporting. Defaults to false. */
  exitOnCrash?: boolean;
}

/** Registers `uncaughtException`/`unhandledRejection` handlers; returns a disposer. */
export function installProcessCrashHandlers(options: ProcessCrashHandlerOptions = {}): () => void {
  const phase = options.phase ?? "api";
  const exitOnCrash = options.exitOnCrash ?? false;

  const onUncaughtException = (error: Error) => {
    console.error("[x] uncaught exception:", error);
    reportException(error, { phase });
    if (exitOnCrash) process.exit(1);
  };

  const onUnhandledRejection = (reason: unknown) => {
    console.error("[x] unhandled rejection:", reason);
    reportException(reason, { phase });
    if (exitOnCrash) process.exit(1);
  };

  process.on("uncaughtException", onUncaughtException);
  process.on("unhandledRejection", onUnhandledRejection);

  return () => {
    process.off("uncaughtException", onUncaughtException);
    process.off("unhandledRejection", onUnhandledRejection);
  };
}
