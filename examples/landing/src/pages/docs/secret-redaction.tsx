import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="label">Observability</p>
      <h1 className="display mt-2 text-[clamp(1.9rem,4vw,2.6rem)] leading-[0.95]">
        Secret redaction
      </h1>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">
        Server logs can silently echo secrets — a DB driver error that interpolates a connection
        string, an app error whose message contains a token, or a caller passing{" "}
        <span className="text-foreground">{"{ password }"}</span> into the logger. The redaction
        layer masks values shaped like secrets before anything reaches the log sink or audit trail.
      </p>

      <h2 className="text-xl">What gets redacted</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        The redaction operates at two levels: string scanning and object walking. Together they
        cover the common ways secrets appear in log data:
      </p>
      <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
        <li>
          <span className="text-foreground">Bearer and Basic tokens</span> — any instance of{" "}
          <span className="text-foreground">Bearer &lt;value&gt;</span> or{" "}
          <span className="text-foreground">Basic &lt;value&gt;</span> in a string is replaced with{" "}
          <span className="text-foreground">Bearer [REDACTED]</span>.
        </li>
        <li>
          <span className="text-foreground">Authorization headers</span> — inline{" "}
          <span className="text-foreground">Authorization: &lt;value&gt;</span> or{" "}
          <span className="text-foreground">auth=&lt;value&gt;</span> patterns.
        </li>
        <li>
          <span className="text-foreground">URI userinfo</span> — credentials in URLs like{" "}
          <span className="text-foreground">https://user:pass@host</span> become{" "}
          <span className="text-foreground">https://user:[REDACTED]@host</span>.
        </li>
        <li>
          <span className="text-foreground">Sensitive key names</span> — any object key matching{" "}
          <span className="text-foreground">password</span>,{" "}
          <span className="text-foreground">token</span>,{" "}
          <span className="text-foreground">secret</span>,{" "}
          <span className="text-foreground">api_key</span>,{" "}
          <span className="text-foreground">private_key</span>,{" "}
          <span className="text-foreground">authorization</span>,{" "}
          <span className="text-foreground">session</span>,{" "}
          <span className="text-foreground">credential</span>, or{" "}
          <span className="text-foreground">bearer</span> has its entire value replaced with{" "}
          <span className="text-foreground">[REDACTED]</span>.
        </li>
      </ul>

      <h2 className="text-xl">redactString — scanning plain text</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        Use <span className="text-foreground">redactString</span> on error messages, log messages,
        or any string that might contain an embedded secret:
      </p>
      <CodeBlock
        label="redacting error messages"
        code={`import { redactString, REDACTED } from "@thexjs/core";

const safe = redactString(
  "Authorization: Bearer sk-abc123def456, connection via https://admin:hunter2@db.example.com"
);
// "Authorization: Bearer [REDACTED], connection via https://admin:[REDACTED]@db.example.com"

const noop = redactString(
  "User 42 updated their profile picture"
);
// unchanged — no secret patterns detected`}
      />

      <h2 className="text-xl">redactValue — sanitizing objects</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        When logging structured data, wrap the object with{" "}
        <span className="text-foreground">redactValue</span>. It walks the object tree recursively,
        redacting both string values (via <span className="text-foreground">redactString</span>) and
        values under sensitive keys:
      </p>
      <CodeBlock
        label="redacting log payloads"
        code={`import { redactValue } from "@thexjs/core";

const payload = {
  userId: "user_abc",
  password: "s3cret!",
  metadata: {
    token: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0",
    error: "Connection refused — Bearer sk-abc123",
  },
};

const safe = redactValue(payload);
// {
//   userId: "user_abc",
//   password: "[REDACTED]",
//   metadata: {
//     token: "[REDACTED]",
//     error: "Connection refused — Bearer [REDACTED]",
//   },
// }`}
      />

      <h2 className="text-xl">Checking key names</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        The <span className="text-foreground">isSensitiveKey</span> function lets you check whether
        a given key name would be treated as sensitive. This is useful when building custom log
        sanitizers:
      </p>
      <CodeBlock
        label="key inspection"
        code={`import { isSensitiveKey } from "@thexjs/core";

isSensitiveKey("password");           // true
isSensitiveKey("api_key");            // true
isSensitiveKey("access-token");       // true
isSensitiveKey("Authorization");      // true
isSensitiveKey("name");               // false
isSensitiveKey("email");              // false`}
      />

      <h2 className="text-xl">Where redaction is applied automatically</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        You don't need to call these functions for most cases — the framework applies them
        internally:
      </p>
      <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
        <li>
          The{" "}
          <a href="/docs/audit-trail" className="text-primary underline underline-offset-2">
            audit trail
          </a>{" "}
          passes every entry's <span className="text-foreground">reason</span> through{" "}
          <span className="text-foreground">redactString</span> and all{" "}
          <span className="text-foreground">metadata</span> values through{" "}
          <span className="text-foreground">redactValue</span>.
        </li>
        <li>
          The{" "}
          <a href="/docs/request-tracing" className="text-primary underline underline-offset-2">
            tracing layer
          </a>{" "}
          passes database statements through <span className="text-foreground">redactString</span>{" "}
          and masks quoted literals before recording them as span attributes.
        </li>
        <li>
          The logger's internal formatter applies{" "}
          <span className="text-foreground">redactValue</span> to every structured field before
          serializing the JSON log line.
        </li>
      </ul>

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
