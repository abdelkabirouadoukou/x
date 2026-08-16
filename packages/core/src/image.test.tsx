import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { buildSrcSet, Image, SRCSET_WIDTHS } from "./image";

const REMOTE = "https://img.example.com/photo.png";
const PROXY = (w?: number, q?: number) => {
  const p = new URLSearchParams({ url: REMOTE });
  if (w !== undefined) p.set("w", String(w));
  if (q !== undefined) p.set("q", String(q));
  return `/_x/image?${p.toString()}`;
};

describe("Image rendering", () => {
  test("renders local src through untouched (no proxy rewrite)", () => {
    const html = renderToStaticMarkup(
      <Image src="/hero.png" alt="hero" width={800} height={600} />,
    );
    expect(html).toContain('src="/hero.png"');
    expect(html).not.toContain("/_x/image");
    expect(html).not.toContain("srcset");
  });

  test("rewrites remote src through the proxy and emits srcset", () => {
    const html = renderToStaticMarkup(<Image src={REMOTE} alt="remote" width={800} height={600} />);
    expect(html).toContain(`src="${PROXY()}"`);
    expect(html).toContain("srcSet");
    for (const w of SRCSET_WIDTHS) {
      expect(html).toContain(`${PROXY(w).replaceAll("&", "&amp;")} ${w}w`);
    }
    expect(html).not.toContain('loading="eager"');
  });

  test("priority skips lazy-loading and adds fetchpriority", () => {
    const html = renderToStaticMarkup(
      <Image src="/lcp.png" alt="lcp" width={100} height={100} priority />,
    );
    expect(html).not.toContain("loading=");
    expect(html).toContain('fetchPriority="high"');
  });

  test("non-priority defaults to lazy", () => {
    const html = renderToStaticMarkup(<Image src="/a.png" alt="a" width={10} height={10} />);
    expect(html).toContain('loading="lazy"');
  });

  test("fill mode emits absolute-positioned cover markup without width/height attrs", () => {
    const html = renderToStaticMarkup(<Image src="/card.png" alt="card" fill />);
    expect(html).toContain("position:absolute");
    expect(html).toContain("object-fit:cover");
    expect(html).not.toContain(`width=`);
    expect(html).not.toContain(`height=`);
  });

  test("aspect-ratio derived from width/height", () => {
    const html = renderToStaticMarkup(<Image src="/a.png" alt="a" width={1600} height={900} />);
    expect(html).toContain("aspect-ratio:1600 / 900");
  });

  test("blur placeholder renders as CSS background", () => {
    const html = renderToStaticMarkup(
      <Image
        src="/real.png"
        alt="a"
        width={10}
        height={10}
        placeholder="blur"
        blurDataURL="data:image/png;base64,AAAA"
      />,
    );
    expect(html).toContain("background-image:url(data:image/png;base64,AAAA)");
    expect(html).toContain("background-size:cover");
  });

  test("children are wrapped in a <picture> unknown-island shell", () => {
    const html = renderToStaticMarkup(
      <Image src={REMOTE} alt="a" width={8} height={8}>
        <source srcSet={PROXY(640)} type="image/avif" />
      </Image>,
    );
    expect(html).toContain("<picture>");
    expect(html).toContain('type="image/avif"');
    expect(html).toContain("<img");
  });

  test("quality is forwarded to the proxy", () => {
    const html = renderToStaticMarkup(
      <Image src={REMOTE} alt="a" width={8} height={8} quality={75} />,
    );
    expect(String(html).includes(`q=75`)).toBe(true);
  });
});

describe("buildSrcSet", () => {
  test("returns undefined for local src", () => {
    expect(buildSrcSet("/a.png", { remoteHosts: ["img.example.com"] })).toBeUndefined();
  });

  test("returns undefined when host is not allow-listed", () => {
    expect(
      buildSrcSet("https://evil.example/a.png", { remoteHosts: ["img.example.com"] }),
    ).toBeUndefined();
  });

  test("returns proxy widths for an allow-listed remote host", () => {
    const set = buildSrcSet(REMOTE, { remoteHosts: ["img.example.com"], quality: 80 });
    expect(set).toBeDefined();
    expect(set).toContain(`${PROXY(640, 80)} 640w`);
    expect(set?.split(", ").length).toBe(SRCSET_WIDTHS.length);
  });
});
