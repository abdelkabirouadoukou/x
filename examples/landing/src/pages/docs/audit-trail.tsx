import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock, TerminalBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="label">Observability</p>
      <h1 className="display mt-2 text-[clamp(1.9rem,4vw,2.6rem)] leading-[0.95]">Audit trail</h1>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">
        Structured, append-only audit logging for security-relevant events. The audit trail captures
        who did what and when — login attempts, permission checks, role changes, session revocations
        — with secrets automatically redacted before they reach the sink.
      </p>

      <h2 className="text-xl">Why a dedicated audit system</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Application logs mix operational data with security events. An audit trail keeps a separate,
        append-only channel for events a compliance reviewer or operator needs: "did anyone log in
        from an unexpected IP?" or "which sessions were revoked before expiry?" Every entry carries
        a typed event name, a timestamp, the user id (or null), the client IP, and a human-readable
        reason — all redacted before emission.
      </p>

      <h2 className="text-xl">Setting up a sink</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        The default sink is a no-op. Install one at application startup — typically in{" "}
        <span className="text-foreground">x.config.ts</span> or a setup file — using{" "}
        <span className="text-foreground">setAuditSink</span>. The built-in console sink writes one
        JSON object per line to stdout:
      </p>
      <CodeBlock
        label="x.config.ts"
        code={`import { defineConfig, createConsoleAuditSink, setAuditSink } from "@thexjs/core";

setAuditSink(createConsoleAuditSink());

export default defineConfig({
  // ... standard options
});`}
      />
      <TerminalBlock
        label="stdout"
        code={`{"timestamp":"2026-08-27T10:00:00.000Z","event":"auth.login.success","userId":"user_abc","ip":"203.0.113.42","reason":"login from known device"}
{"timestamp":"2026-08-27T10:01:00.000Z","event":"auth.login.failure","ip":"198.51.100.7","reason":"invalid password"}`}
      />

      <h2 className="text-xl">Logging events</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Use the convenience functions for the built-in event types. Each accepts a consistent input
        shape and handles redaction automatically:
      </p>
      <CodeBlock
        label="src/api/auth.ts"
        code={`import {
  auditLoginSuccess,
  auditLoginFailure,
  auditLogout,
  auditPermissionDenied,
} from "@thexjs/core";

// After validating credentials
auditLoginSuccess({
  userId: session.userId,
  ip: clientIpFromRequest(req),
  reason: "credentials match",
  requestId: requestIdFromRequest(req),
});

// When a password is wrong
auditLoginFailure({
  ip: clientIpFromRequest(req),
  reason: "invalid password for user@example.com",
});

// On logout
auditLogout({
  userId: session.userId,
  ip: clientIpFromRequest(req),
});

// When a route guard rejects a request
auditPermissionDenied({
  userId: activeUser.id,
  ip: clientIpFromRequest(req),
  reason: "user lacks admin role",
  metadata: { route: "/admin/settings" },
});`}
      />

      <h2 className="text-xl">Custom events</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        For application-specific security events, call the low-level{" "}
        <span className="text-foreground">audit</span> function directly with your own{" "}
        <span className="text-foreground">AuditEntry</span>. The same redaction rules apply:
      </p>
      <CodeBlock
        label="custom audit event"
        code={`import { audit } from "@thexjs/core";

audit({
  timestamp: new Date().toISOString(),
  event: "auth.login.success",  // must match the AuditEvent union
  userId: "user_abc",
  ip: "203.0.113.42",
  reason: "OAuth flow completed",
  provider: "github",
  metadata: { org: "acme-corp", plan: "enterprise" },
});`}
      />

      <h2 className="text-xl">Writing a custom sink</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Implement the <span className="text-foreground">AuditSink</span> interface to route events
        to a SIEM, a database table, or a cloud logging service:
      </p>
      <CodeBlock
        label="custom sink — SIEM webhook"
        code={`import { type AuditSink, type AuditEntry, setAuditSink } from "@thexjs/core";

class SiemWebhookSink implements AuditSink {
  async write(entry: AuditEntry): Promise<void> {
    // Fire-and-forget POST to your SIEM
    fetch("https://siem.example.com/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    }).catch(() => {}); // don't block the request
  }
}

setAuditSink(new SiemWebhookSink());`}
      />
      <p className="mt-4 text-muted-foreground">
        The sink must treat entries as append-only — never modify or delete past entries. The
        default console sink achieves this via stdout (append-only at the OS level). A
        database-backed sink should use <span className="text-foreground">INSERT</span> with no{" "}
        <span className="text-foreground">UPDATE</span> or{" "}
        <span className="text-foreground">DELETE</span>.
      </p>

      <h2 className="text-xl">Redaction guarantees</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Before the entry reaches the sink, the <span className="text-foreground">audit</span>{" "}
        function passes the <span className="text-foreground">reason</span> string through{" "}
        <span className="text-foreground">redactString</span> and every value in{" "}
        <span className="text-foreground">metadata</span> through{" "}
        <span className="text-foreground">redactValue</span>. This means bearer tokens, password
        strings, or API keys that accidentally end up in a metadata field are masked as{" "}
        <span className="text-foreground">[REDACTED]</span> before they leave the process. See the{" "}
        <a href="/docs/secret-redaction" className="text-primary underline underline-offset-2">
          Secret Redaction
        </a>{" "}
        page for the full rules.
      </p>

      <h2 className="text-xl">API reference</h2>
      <CodeBlock
        label="AuditEntry"
        code={`interface AuditEntry {
  timestamp: string;            // ISO 8601
  event: AuditEvent;            // typed union of event names
  userId: string | null;        // authenticated user, or null for anonymous
  ip: string | null;            // client IP from socket or X-Forwarded-For
  reason?: string;              // human-readable explanation (redacted)
  provider?: string;            // e.g. "github", "credentials"
  requestId?: string;           // correlation with request logs
  sessionHash?: string;         // HMAC digest of session token (safe to store)
  metadata?: Record<string, unknown>;  // app-specific data (redacted)
}`}
      />
      <CodeBlock
        label="Event types"
        code={`type AuditEvent =
  | "auth.login.success"
  | "auth.login.failure"
  | "auth.logout"
  | "auth.password_changed"
  | "auth.role_changed"
  | "auth.permission_denied"
  | "auth.session_revoked";`}
      />

      <div className="mt-16 border-t border-border pt-8">
        <a
          href="/docs/observability"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          <ArrowRight className="h-3.5 w-3.5 rotate-180" /> Observability
        </a>
      </div>
    </div>
  );
}
