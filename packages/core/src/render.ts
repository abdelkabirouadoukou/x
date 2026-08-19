import type { ReactNode } from "react";
import { renderToReadableStream, renderToStaticMarkup, renderToString } from "react-dom/server";
import { CLIENT_NAV_SCRIPT } from "./client-nav";
import { LIVE_RELOAD_SCRIPT } from "./live-reload";

export interface RenderOptions {
  title?: string;
  islandScripts?: string[];
  islandProps?: Record<string, string>;
  /** Path to a stylesheet to <link> in <head>, e.g. "/styles.css". */
  stylesheet?: string | undefined;
  /** Set to false to omit the client-side navigation script. Defaults to true. */
  clientNav?: boolean;
  /** Inject live-reload script (development mode). */
  liveReload?: boolean;
  /**
   * Called when the SSR stream fails mid-flight. Pass this through to
   * `renderStreamingPage` so the app can report the failure via its error
   * reporter/metrics instead of shipping a partial page silently.
   */
  onRenderError?: (error: unknown) => void;
  /**
   * Single-render island resolution. When set, the page renders exactly once
   * and this callback is awaited to resolve the island script list from the
   * islands that pass actually produced (the caller holds the registry). Used
   * to eliminate the two-pass discovery render.
   */
  resolveIslandScripts?: () => Promise<string[]>;
}

export interface LoaderArgs {
  params: Record<string, string>;
  request: Request;
}

export type LoaderReturn = Record<string, unknown> | Response;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeJsonForScript(s: string): string {
  return s.replace(/<\//g, "<\\/");
}

function buildHeadExtras(stylesheet: string | undefined): string {
  return stylesheet ? `\n    <link rel="stylesheet" href="${escapeHtml(stylesheet)}" />` : "";
}

function buildNavScriptTag(clientNav: boolean | undefined): string {
  return clientNav === false ? "" : `\n    <script>${CLIENT_NAV_SCRIPT}</script>`;
}

function buildLiveReloadTag(liveReload: boolean | undefined): string {
  return liveReload ? `\n    <script>${LIVE_RELOAD_SCRIPT}</script>` : "";
}

function htmlShell(
  title: string,
  headExtras: string,
  propsScript: string,
  scripts: string | undefined,
  bodySlot: string,
  navScriptTag: string,
  liveReloadTag: string,
): string {
  const finalScripts = scripts ?? "";
  const inside = `${bodySlot}${propsScript ? `\n    ${propsScript}` : ""}${finalScripts ? `\n    ${finalScripts}` : ""}`;
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>${headExtras}
  </head>
  <body>
    <div id="root">${inside}</div>
    ${navScriptTag ? `    ${navScriptTag}\n` : ""}${liveReloadTag}  </body>
</html>`;
}

export function renderPage(node: ReactNode, options: RenderOptions = {}): string {
  const body = renderToString(node);
  return buildShellHtml(body, options, options.islandScripts ?? []);
}

export function renderStaticPage(node: ReactNode, options: RenderOptions = {}): string {
  const body = renderToStaticMarkup(node);
  return buildShellHtml(body, options, options.islandScripts ?? []);
}

/**
 * Single-render page render: renders the tree exactly once, then resolves the
 * island script set from the islands that pass actually produced (via
 * `options.resolveIslandScripts`). Replaces the old two-pass discovery render
 * so non-deterministic components can't diverge between the discovery pass and
 * the real one.
 */
export async function renderPageOnce(
  node: ReactNode,
  options: RenderOptions = {},
): Promise<string> {
  const body = renderToString(node);
  const scripts = options.resolveIslandScripts
    ? await options.resolveIslandScripts()
    : (options.islandScripts ?? []);
  return buildShellHtml(body, options, scripts);
}

function buildShellHtml(body: string, options: RenderOptions, islandScripts: string[]): string {
  const { islandProps } = options;
  const title = options.title ?? "x app";
  const propsJson = islandProps ? escapeJsonForScript(JSON.stringify(islandProps)) : "";
  const propsScript = islandProps
    ? `<script id="__X_ISLAND_PROPS" type="application/json">${propsJson}</script>`
    : "";
  const islandScriptsHtml = islandScripts
    .map((src) => `<script data-island-script src="${escapeHtml(src)}"></script>`)
    .join("\n    ");

  return htmlShell(
    title,
    buildHeadExtras(options.stylesheet),
    propsScript,
    islandScriptsHtml,
    body,
    buildNavScriptTag(options.clientNav),
    buildLiveReloadTag(options.liveReload),
  );
}

export interface RenderStreamingOptions {
  /** Bytes already encoded ahead of the source stream's first chunk. */
  header: Uint8Array;
  /**
   * Bytes to enqueue once the source stream reports done — or a function that
   * produces them lazily (e.g. the island script list is only known after the
   * render completed). Called at most once.
   */
  footer: Uint8Array | (() => Promise<Uint8Array>);
  /**
   * Called once when the source stream fails mid-flight. Consumers use this
   * to report the failure (error reporter, metrics) instead of silently
   * shipping a partial page to the client.
   */
  onRenderError?: (error: unknown) => void;
  /** Called when the consumer cancels the returned stream (client dropped). */
  onCancel?: (reason: unknown) => void;
}

/**
 * Bridges a source `ReadableStream` (e.g. React's SSR stream) onto a
 * response stream with real backpressure and cancellation.
 *
 * Backpressure: the pump is pull-driven — it only reads from the source while
 * the sink's `desiredSize` is positive. A slow client therefore throttles
 * reads from the source instead of buffering its output unboundedly in memory.
 *
 * Cancellation: `cancel(reason)` on the returned stream cancels the source
 * reader, so a client disconnect stops the underlying render (no wasted CPU,
 * no escaping rejection).
 *
 * Errors: a mid-stream failure calls `onRenderError` exactly once and then
 * errors the response stream. The consumer chooses how to surface it.
 */
export function pumpStreamingResponse(
  source: ReadableStream<Uint8Array>,
  options: RenderStreamingOptions,
): ReadableStream<Uint8Array> {
  const { header, footer, onRenderError, onCancel } = options;
  const reader = source.getReader();
  let headerSent = false;
  let ended = false;

  async function readAhead(controller: ReadableStreamDefaultController<Uint8Array>): Promise<void> {
    if (!headerSent) {
      headerSent = true;
      controller.enqueue(header);
    }
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (!ended) {
          const footerBytes = typeof footer === "function" ? await footer() : footer;
          ended = true;
          try {
            controller.enqueue(footerBytes);
          } catch {
            // Sink already errored/closed; nothing left to flush.
          }
          controller.close();
        }
        return;
      }
      controller.enqueue(value);
      // Respect backpressure: stop pulling once the sink has no room. The next
      // pull() (consumer reading again) resumes the loop.
      if (controller.desiredSize !== null && controller.desiredSize <= 0) return;
    }
  }

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        await readAhead(controller);
      } catch (err) {
        if (!ended) {
          ended = true;
          onRenderError?.(err);
        }
        try {
          controller.error(err);
        } catch {
          // Sink is already closed/errored from the consumer side.
        }
      }
    },
    cancel(reason) {
      reader.cancel(reason).catch(() => {
        // Cancel rejection is expected on disconnect (Bun may drop the
        // underlying reader); never let it escape as an unhandled rejection.
      });
      onCancel?.(reason);
    },
  });
}

export async function renderStreamingPage(
  node: ReactNode,
  options: RenderOptions = {},
): Promise<ReadableStream<Uint8Array>> {
  const { islandScripts, islandProps } = options;
  const title = escapeHtml(options.title ?? "x app");

  const propsJson = islandProps ? escapeJsonForScript(JSON.stringify(islandProps)) : "";
  const propsScript = islandProps
    ? `<script id="__X_ISLAND_PROPS" type="application/json">${propsJson}</script>`
    : "";
  const navScriptTag = buildNavScriptTag(options.clientNav);
  const liveReloadTag = buildLiveReloadTag(options.liveReload);
  const headExtras = buildHeadExtras(options.stylesheet);
  const footer = `</div>${navScriptTag}\n${liveReloadTag}  </body>\n</html>`;

  const reactStream = await renderToReadableStream(node, {
    onError(err) {
      console.error("[x] render error:", err);
    },
  });
  const encoder = new TextEncoder();
  const header = `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>${title}</title>${headExtras}\n  </head>\n  <body>\n    <div id="root">`;

  return pumpStreamingResponse(reactStream, {
    header: encoder.encode(header),
    // Lazy footer: the island script list may only be knowable after the
    // render completed (single-render mode), so resolve it right before the
    // closing tags are emitted rather than up front.
    footer: async () => {
      const scripts = islandScripts ?? (await options.resolveIslandScripts?.()) ?? [];
      const islandScriptsHtml = scripts
        .map((src) => `<script data-island-script src="${escapeHtml(src)}"></script>`)
        .join("\n    ");
      const rootFooter = `${propsScript ? `    ${propsScript}\n` : ""}${islandScriptsHtml ? `    ${islandScriptsHtml}\n` : ""}`;
      return encoder.encode(`${rootFooter}\n  ${footer}`);
    },
    ...(options.onRenderError ? { onRenderError: options.onRenderError } : {}),
  });
}
