import { useEffect, useRef, useState } from "react";

const COMMAND = "bun create thexjs-app@latest";

/**
 * Closing CTA: giant headline, a command that types itself in once the island
 * is visible, and a copy button. The ghost "x" behind it lives in the page.
 */
export default function TryItNow() {
  const [copied, setCopied] = useState(false);
  const [typed, setTyped] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped(COMMAND.length);
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(i);
      if (i >= COMMAND.length) window.clearInterval(id);
    }, 38);
    return () => window.clearInterval(id);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(COMMAND);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = COMMAND;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const done = typed >= COMMAND.length;

  return (
    <div className="lp-wrap lp-cta-inner">
      <p className="lp-eyebrow">
        <span>
          <b>07</b> Try it right now
        </span>
        <span className="lp-eyebrow-note">zero configuration</span>
      </p>
      <p className="lp-cta-h">
        Ship something <em>fast</em>.
      </p>
      <p className="lp-lead">
        One command scaffolds a complete project: pages, API routes, auth, and the build pipeline.
      </p>

      <div className="lp-cmd">
        <code>
          <span className="lp-cmd-p">$</span> {COMMAND.slice(0, typed)}
          {!done && <span className="lp-cmd-caret" />}
        </code>
        <button type="button" onClick={copy} aria-label="Copy command">
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>

      <div className="lp-cta">
        <a href="/docs/installation" className="lp-btn lp-btn-solid">
          Install X
        </a>
        <a href="/docs" className="lp-btn lp-btn-ghost">
          Read the docs
        </a>
      </div>
    </div>
  );
}
