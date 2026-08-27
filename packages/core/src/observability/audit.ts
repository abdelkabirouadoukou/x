/**
 * Structured, append-only audit logging for security-relevant events.
 *
 * Mirrors the `MetricsReporter`/`ErrorReporter` pluggability discipline: a
 * default sink prints one JSON line per event to stdout (append-only at the OS
 * level), and enterprise deployments swap in a SIEM sink via `setAuditSink`
 * without forking the framework. Every entry carries the event type, a
 * timestamp, `userId` (or null), the client IP (or null) and a human-readable
 * reason, so a compliance reviewer can answer "who did what, when" and an
 * operator can spot brute-force patterns.
 *
 * Secrets are scrubbed before emission: the reason string and any metadata are
 * passed through the same redaction used by the logger, and fields are
 * structured (typed keys) rather than free-form blobs, so a password or token
 * value cannot slip into an entry.
 */

import { SAFE_REQUEST_ID_RE } from "../security/validation";
import { redactString, redactValue } from "./redact";

export type AuditEvent =
  | "auth.login.success"
  | "auth.login.failure"
  | "auth.logout"
  | "auth.password_changed"
  | "auth.role_changed"
  | "auth.permission_denied"
  | "auth.session_revoked";

export interface AuditEntry {
  timestamp: string;
  event: AuditEvent;
  userId: string | null;
  ip: string | null;
  reason?: string;
  provider?: string;
  requestId?: string;
  /** HMAC digest of the session token (safe to store — not the token itself). */
  sessionHash?: string;
  metadata?: Record<string, unknown>;
}

/** Receives audit entries. Implementations must treat them as append-only. */
export interface AuditSink {
  write(entry: AuditEntry): void;
}

/** No-op sink used until an app installs one. */
export const noopAuditSink: AuditSink = {
  write: () => {},
};

/** Default sink: one JSON object per line on stdout — append-only at the OS level. */
export function createConsoleAuditSink(): AuditSink {
  return {
    write(entry) {
      console.log(JSON.stringify(entry));
    },
  };
}

let activeSink: AuditSink = noopAuditSink;

export function setAuditSink(sink: AuditSink): void {
  activeSink = sink;
}

export function getAuditSink(): AuditSink {
  return activeSink;
}

/** Re-export: canonical implementation lives in security/ip.ts. */
export { clientIpFromRequest } from "../security/ip";

/** Correlation id already assigned to the request by `withRequestLogging`, if any. */
export function requestIdFromRequest(req: Request): string | undefined {
  const raw = req.headers.get("x-request-id");
  if (raw === null) return undefined;
  if (!SAFE_REQUEST_ID_RE.test(raw)) return undefined;
  return raw;
}

/**
 * Emits an audit entry with the reason (and any metadata) redacted so secret
 * patterns that ride along in error strings or metadata objects never reach
 * the sink.
 */
export function audit(entry: AuditEntry): void {
  const redacted: AuditEntry = {
    timestamp: entry.timestamp,
    event: entry.event,
    userId: entry.userId,
    ip: entry.ip,
    ...(entry.reason !== undefined ? { reason: redactString(entry.reason) } : {}),
    ...(entry.provider !== undefined ? { provider: entry.provider } : {}),
    ...(entry.requestId !== undefined ? { requestId: entry.requestId } : {}),
    ...(entry.sessionHash !== undefined ? { sessionHash: entry.sessionHash } : {}),
    ...(entry.metadata !== undefined
      ? { metadata: redactValue(entry.metadata) as Record<string, unknown> }
      : {}),
  };
  activeSink.write(redacted);
}

interface AuditEventInput {
  userId: string | null;
  ip: string | null;
  reason?: string;
  provider?: string;
  requestId?: string;
  sessionHash?: string;
  metadata?: Record<string, unknown>;
}

/** Convenience helpers for the framework's own events and app-driven events. */
export function auditLoginSuccess(input: AuditEventInput & { userId: string }): void {
  audit({
    timestamp: new Date().toISOString(),
    event: "auth.login.success",
    ...input,
  });
}

export function auditLoginFailure(input: AuditEventInput): void {
  audit({
    timestamp: new Date().toISOString(),
    event: "auth.login.failure",
    ...input,
  });
}

export function auditLogout(input: AuditEventInput): void {
  audit({
    timestamp: new Date().toISOString(),
    event: "auth.logout",
    ...input,
  });
}

export function auditPasswordChanged(input: AuditEventInput & { userId: string }): void {
  audit({
    timestamp: new Date().toISOString(),
    event: "auth.password_changed",
    ...input,
  });
}

export function auditRoleChanged(input: AuditEventInput & { userId: string }): void {
  audit({
    timestamp: new Date().toISOString(),
    event: "auth.role_changed",
    ...input,
  });
}

export function auditPermissionDenied(input: AuditEventInput): void {
  audit({
    timestamp: new Date().toISOString(),
    event: "auth.permission_denied",
    ...input,
  });
}

export function auditSessionRevoked(input: AuditEventInput & { userId: string }): void {
  audit({
    timestamp: new Date().toISOString(),
    event: "auth.session_revoked",
    ...input,
  });
}
