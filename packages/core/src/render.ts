import type { ReactNode } from "react";
import { renderToReadableStream, renderToStaticMarkup, renderToString } from "react-dom/server";

export interface RenderOptions {
  title?: string;
  islandScripts?: string[];
  islandProps?: Record<string, string>;
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

function htmlShell(
  title: string,
  propsScript: string,
  scripts: string | undefined,
  bodySlot: string,
): string {
  const finalScripts = scripts ?? "";
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <div id="root">${bodySlot}</div>
    ${propsScript ? `    ${propsScript}\n` : ""}${finalScripts ? `    ${finalScripts}\n` : ""}  </body>
</html>`;
}

export function renderPage(node: ReactNode, options: RenderOptions = {}): string {
  const { islandScripts, islandProps } = options;
  const title = escapeHtml(options.title ?? "x app");

  const body = renderToString(node);
  const scripts = islandScripts
    ?.map((src) => `<script type="module" data-island-script src="${escapeHtml(src)}"></script>`)
    .join("\n    ");

  const propsJson = islandProps ? escapeJsonForScript(JSON.stringify(islandProps)) : "";
  const propsScript = islandProps
    ? `<script id="__X_ISLAND_PROPS" type="application/json">${propsJson}</script>`
    : "";

  return htmlShell(title, propsScript, scripts, body);
}

export function renderStaticPage(node: ReactNode, options: RenderOptions = {}): string {
  const { islandScripts, islandProps } = options;
  const title = escapeHtml(options.title ?? "x app");

  const body = renderToStaticMarkup(node);
  const scripts = islandScripts
    ?.map((src) => `<script type="module" data-island-script src="${escapeHtml(src)}"></script>`)
    .join("\n    ");

  const propsJson = islandProps ? escapeJsonForScript(JSON.stringify(islandProps)) : "";
  const propsScript = islandProps
    ? `<script id="__X_ISLAND_PROPS" type="application/json">${propsJson}</script>`
    : "";

  return htmlShell(title, propsScript, scripts, body);
}

export async function renderStreamingPage(
  node: ReactNode,
  options: RenderOptions = {},
): Promise<ReadableStream<Uint8Array>> {
  const { islandScripts, islandProps } = options;
  const title = escapeHtml(options.title ?? "x app");

  const scripts = islandScripts
    ?.map((src) => `<script type="module" data-island-script src="${escapeHtml(src)}"></script>`)
    .join("\n    ");

  const propsJson = islandProps ? escapeJsonForScript(JSON.stringify(islandProps)) : "";
  const propsScript = islandProps
    ? `<script id="__X_ISLAND_PROPS" type="application/json">${propsJson}</script>`
    : "";
  const footer = `${propsScript ? `    ${propsScript}\n` : ""}${scripts ? `    ${scripts}\n` : ""}  </body>\n</html>`;

  const reactStream = await renderToReadableStream(node, {
    onError(err) {
      console.error("[x] render error:", err);
    },
  });
  const encoder = new TextEncoder();
  const header = `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>${title}</title>\n  </head>\n  <body>\n    <div id="root">`;

  return new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(header));
      const reader = reactStream.getReader();
      async function pump(): Promise<void> {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode(`</div>\n    ${footer}`));
          controller.close();
          return;
        }
        controller.enqueue(value);
        await pump();
      }
      await pump();
    },
  });
}
