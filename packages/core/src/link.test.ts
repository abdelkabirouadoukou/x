import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Link } from "./link";

describe("Link", () => {
  test("renders a plain anchor for client nav", () => {
    const html = renderToStaticMarkup(createElement(Link, { href: "/about" }, "About"));
    expect(html).toBe('<a href="/about">About</a>');
  });

  test("opts out of client nav with data-no-nav", () => {
    const html = renderToStaticMarkup(
      createElement(Link, { href: "/about", clientNav: false }, "About"),
    );
    expect(html).toContain('data-no-nav=""');
    expect(html).toContain('href="/about"');
  });

  test("opts out of prefetch with data-no-prefetch", () => {
    const html = renderToStaticMarkup(
      createElement(Link, { href: "/about", prefetch: false }, "About"),
    );
    expect(html).toContain('data-no-prefetch=""');
  });
});
