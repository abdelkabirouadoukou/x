function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderErrorOverlay(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown error";
  const stack = error instanceof Error ? (error.stack ?? "") : "";
  const frames = stack
    .split("\n")
    .slice(1)
    .map((line) => `<span class="frame">${escapeHtml(line.trim())}</span>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Server Error</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background: #1a1a2e;
        color: #e0e0e0;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }
      .overlay {
        flex: 1;
        padding: 40px 24px;
        max-width: 900px;
        margin: 0 auto;
        width: 100%;
      }
      .header { margin-bottom: 32px; }
      .badge {
        display: inline-block;
        background: #e74c3c;
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        padding: 3px 10px;
        border-radius: 4px;
        margin-bottom: 12px;
      }
      h1 {
        font-size: 22px;
        font-weight: 600;
        color: #f0f0f0;
        line-height: 1.3;
      }
      .message-box {
        background: #2a2a4a;
        border: 1px solid #3a3a5a;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 24px;
        font-size: 15px;
        word-break: break-word;
      }
      .message-box .label {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #888;
        margin-bottom: 8px;
      }
      .message-box .message {
        color: #ff6b6b;
        font-family: "SF Mono", "Fira Code", "Fira Mono", monospace;
        font-size: 14px;
        white-space: pre-wrap;
      }
      .stack-section { margin-bottom: 24px; }
      .stack-section .label {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #888;
        margin-bottom: 12px;
      }
      .frame {
        display: block;
        padding: 6px 12px;
        font-family: "SF Mono", "Fira Code", "Fira Mono", monospace;
        font-size: 12px;
        color: #b0b0d0;
        line-height: 1.6;
        border-left: 2px solid #3a3a5a;
        margin-bottom: 2px;
      }
      .frame:first-child { border-left-color: #e74c3c; }
      .hint {
        font-size: 13px;
        color: #888;
        border-top: 1px solid #3a3a5a;
        padding-top: 20px;
        margin-top: 8px;
      }
      .hint a { color: #6ab0ff; }
    </style>
  </head>
  <body>
    <div class="overlay">
      <div class="header">
        <div class="badge">Server Error</div>
        <h1>Unhandled Error During Render</h1>
      </div>
      <div class="message-box">
        <div class="label">Error</div>
        <div class="message">${escapeHtml(message)}</div>
      </div>
      ${stack ? `<div class="stack-section"><div class="label">Stack Trace</div>${frames}</div>` : ""}
      <div class="hint">
        Fix the error and save the file. In development mode, the server will reload automatically.
      </div>
    </div>
  </body>
</html>`;
}
