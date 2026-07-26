import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";

export function renderPage(node: ReactNode, title = "x app"): string {
  const body = renderToString(node);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root">${body}</div>
  </body>
</html>`;
}
