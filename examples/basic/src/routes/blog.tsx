import { join } from "node:path";
import { scanContent } from "@x/core";
import type { LoaderArgs, RouteProps } from "@x/core";
import { createElement } from "react";

export async function loader(_args: LoaderArgs) {
  const contentDir = join(import.meta.dir, "..", "..", "content");
  const entries = scanContent(contentDir);
  return {
    entries: entries.map((e) => ({ routePath: e.routePath, title: e.frontmatter.title ?? e.slug })),
  };
}

export default function BlogPage({ loaderData }: RouteProps) {
  const entries = (loaderData?.entries ?? []) as { routePath: string; title: string }[];
  return createElement(
    "main",
    { style: { maxWidth: 640, margin: "4rem auto", fontFamily: "system-ui, sans-serif" } },
    createElement("h1", null, "Blog"),
    entries.length === 0
      ? createElement("p", null, "No posts yet.")
      : createElement(
          "ul",
          null,
          ...entries.map((entry) =>
            createElement(
              "li",
              { key: entry.routePath },
              createElement("a", { href: entry.routePath }, entry.title),
            ),
          ),
        ),
    createElement(
      "p",
      { style: { marginTop: "2rem" } },
      createElement("a", { href: "/" }, "Back home"),
    ),
  );
}
