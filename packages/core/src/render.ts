import type { ReactNode } from "react";
import { renderToStaticMarkup, renderToString } from "react-dom/server";

export interface RenderOptions {
  title?: string;
  islandScripts?: string[];
  islandProps?: Record<string, string>;
}

export function renderPage(node: ReactNode, options: RenderOptions = {}): string {
  const { title = "x app", islandScripts, islandProps } = options;

  const body = renderToString(node);
  const scripts = islandScripts
    ?.map((src) => `<script type="module" data-island-script src="${src}"></script>`)
    .join("\n    ");

  const propsScript = islandProps
    ? `<script id="__X_ISLAND_PROPS" type="application/json">${JSON.stringify(islandProps)}</script>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root">${body}</div>
    ${propsScript ? `    ${propsScript}\n` : ""}${scripts ? `    ${scripts}\n` : ""}  </body>
</html>`;
}

export function renderStaticPage(node: ReactNode, options: RenderOptions = {}): string {
  const { title = "x app", islandScripts, islandProps } = options;

  const body = renderToStaticMarkup(node);
  const scripts = islandScripts
    ?.map((src) => `<script type="module" data-island-script src="${src}"></script>`)
    .join("\n    ");

  const propsScript = islandProps
    ? `<script id="__X_ISLAND_PROPS" type="application/json">${JSON.stringify(islandProps)}</script>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root">${body}</div>
    ${propsScript ? `    ${propsScript}\n` : ""}${scripts ? `    ${scripts}\n` : ""}  </body>
</html>`;
}
