import type { ReactNode } from "react";
import { renderToReadableStream, renderToStaticMarkup, renderToString } from "react-dom/server";
import { CLIENT_NAV_SCRIPT } from "./client-nav";

export interface RenderOptions {
  title?: string;
  islandScripts?: string[];
  islandProps?: Record<string, string>;
  /** Path to a stylesheet to <link> in <head>, e.g. "/styles.css". */
  stylesheet?: string;
  /** Set to false to omit the client-side navigation script. Defaults to true. */
  clientNav?: boolean;
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

function htmlShell(
  title: string,
  headExtras: string,
  propsScript: string,
  scripts: string | undefined,
  bodySlot: string,
  navScriptTag: string,
): string {
  const finalScripts = scripts ?? "";
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>${headExtras}
  </head>
  <body>
    <div id="root">${bodySlot}</div>
    ${propsScript ? `    ${propsScript}\n` : ""}${finalScripts ? `    ${finalScripts}\n` : ""}${navScriptTag ? `    ${navScriptTag}\n` : ""}  </body>
</html>`;
}

export function renderPage(node: ReactNode, options: RenderOptions = {}): string {
  const { islandScripts, islandProps } = options;
  const title = options.title ?? "x app";

  const body = renderToString(node);
  const propsJson = islandProps ? escapeJsonForScript(JSON.stringify(islandProps)) : "";
  const propsScript = islandProps
    ? `<script id="__X_ISLAND_PROPS" type="application/json">${propsJson}</script>`
    : "";
  const islandScriptsHtml = islandScripts
    ?.map((src) => `<script type="module" data-island-script src="${escapeHtml(src)}"></script>`)
    .join("\n    ");

  return htmlShell(
    title,
    buildHeadExtras(options.stylesheet),
    propsScript,
    islandScriptsHtml,
    body,
    buildNavScriptTag(options.clientNav),
  );
}

export function renderStaticPage(node: ReactNode, options: RenderOptions = {}): string {
  const { islandScripts, islandProps } = options;
  const title = options.title ?? "x app";

  const body = renderToStaticMarkup(node);
  const propsJson = islandProps ? escapeJsonForScript(JSON.stringify(islandProps)) : "";
  const propsScript = islandProps
    ? `<script id="__X_ISLAND_PROPS" type="application/json">${propsJson}</script>`
    : "";
  const islandScriptsHtml = islandScripts
    ?.map((src) => `<script type="module" data-island-script src="${escapeHtml(src)}"></script>`)
    .join("\n    ");

  return htmlShell(
    title,
    buildHeadExtras(options.stylesheet),
    propsScript,
    islandScriptsHtml,
    body,
    buildNavScriptTag(options.clientNav),
  );
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
  const islandScriptsHtml = islandScripts
    ?.map((src) => `<script type="module" data-island-script src="${escapeHtml(src)}"></script>`)
    .join("\n    ");
  const navScriptTag = buildNavScriptTag(options.clientNav);
  const headExtras = buildHeadExtras(options.stylesheet);
  const rootFooter = `${propsScript ? `    ${propsScript}\n` : ""}${islandScriptsHtml ? `    ${islandScriptsHtml}\n` : ""}`;
  const footer = `</div>${navScriptTag}\n  </body>\n</html>`;

  const reactStream = await renderToReadableStream(node, {
    onError(err) {
      console.error("[x] render error:", err);
    },
  });
  const encoder = new TextEncoder();
  const header = `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>${title}</title>${headExtras}\n  </head>\n  <body>\n    <div id="root">`;

  return new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(header));
      const reader = reactStream.getReader();
      async function pump(): Promise<void> {
        try {
          const { done, value } = await reader.read();
          if (done) {
            controller.enqueue(encoder.encode(`${rootFooter}\n  ${footer}`));
            controller.close();
            return;
          }
          controller.enqueue(value);
          await pump();
        } catch (err) {
          console.error("[x] stream read error:", err);
          controller.enqueue(
            encoder.encode(
              `${rootFooter}<div style="color:red;padding:1em;margin:1rem">Render error: ${err instanceof Error ? err.message : "Unknown"}</div>\n  ${footer}`,
            ),
          );
          controller.close();
        }
      }
      await pump();
    },
  });
}
