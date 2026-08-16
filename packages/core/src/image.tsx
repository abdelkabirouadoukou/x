import type { CSSProperties, ReactNode } from "react";

/**
 * next/image-equivalent image component. Moves the examples/basic `<Image>`
 * wrapper into the framework so every x app gets it for free: responsive
 * `srcset`/`sizes` via the allow-listed remote-image proxy (/ _/image),
 * an LCP-friendly `priority` mode, blur placeholder, `fill` mode, automatic
 * remote->proxy rewriting, and dev-only warnings. Build-time image
 * optimization and format transcoding are explicitly out of scope for now —
 * the proxy passes requests through unresized, and `<picture>` sources are a
 * no-op until the proxy grows avif/webp capability.
 */

const DEV = typeof process !== "undefined" && process.env?.NODE_ENV === "development";

export interface ImageProps {
  src: string;
  alt: string;
  /** Intrinsic width in px. Omitted when using `fill`. */
  width?: number;
  /** Intrinsic height in px. Omitted when using `fill`. */
  height?: number;
  /** `sizes` attribute for responsive srcset. */
  sizes?: string;
  /** LCP image — skips lazy-loading, adds fetchpriority="high". */
  priority?: boolean;
  /** Absolutely-fill the parent (hero/card layouts). Mutually exclusive with width/height. */
  fill?: boolean;
  /** Blur placeholder mode. Requires blurDataURL for a visible effect. */
  placeholder?: "blur" | "empty";
  /** Tiny base64 image used as the blur placeholder until the real image loads. */
  blurDataURL?: string;
  /** 1-100, forwarded to the proxy as `&q=` (validated-and-ignored until a resizer exists). */
  quality?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** Remote-image proxy endpoint. */
const PROXY_PATH = "/_x/image";

/** Candidate widths for srcset generation (px), spread across common breakpoints/DPR. */
export const SRCSET_WIDTHS = [320, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];

/** True when `src` is an absolute http(s) URL (remote) rather than local/relative. */
function isRemoteUrl(src: string): boolean {
  return /^https?:\/\//i.test(src);
}

function proxyUrl(src: string, w?: number, q?: number): string {
  const params = new URLSearchParams({ url: src });
  if (w !== undefined) params.set("w", String(w));
  if (q !== undefined) params.set("q", String(q));
  return `${PROXY_PATH}?${params.toString()}`;
}

/** Dev-only warning; no-op outside development, stripped in production builds. */
function devWarn(message: string): void {
  if (DEV) {
    console.warn(`[x/image] ${message}`);
  }
}

/**
 * Generates a responsive srcset for a remote image by appending width params
 * to the proxy URL (`/_x/image?url=...&w=640`, ...) — only when the src is
 * remote and its host is in the allow-list. Local images have no resize
 * pipeline, so they return undefined and use the intrinsic src.
 */
export function buildSrcSet(
  src: string,
  opts: { quality?: number; remoteHosts?: string[] } = {},
): string | undefined {
  if (!isRemoteUrl(src)) return undefined;
  try {
    const hosts = new Set(opts.remoteHosts ?? []);
    if (!hosts.has(new URL(src).hostname)) return undefined;
  } catch {
    return undefined;
  }
  return SRCSET_WIDTHS.map((w) => `${proxyUrl(src, w, opts.quality)} ${w}w`).join(", ");
}

/**
 * Set an explicit remote-host allow-list so dev-mode warnings can fail fast
 * on a remote src whose host isn't configured. Mirrors x.config images.remoteHosts.
 */
export function setImageRemoteHosts(hosts: string[]): void {
  _remoteHosts = hosts;
}

// Static host allow-list used for dev-mode warnings (not security — the proxy
// enforces the real allow-list at request time).
let _remoteHosts: string[] | undefined;

export function Image(props: ImageProps): ReactNode {
  const {
    src,
    alt,
    width,
    height,
    sizes,
    priority = false,
    fill = false,
    placeholder = "empty",
    blurDataURL,
    quality,
    className,
    style: userStyle,
    children,
  } = props;

  const remote = isRemoteUrl(src);

  if (DEV) {
    if (fill && (width !== undefined || height !== undefined)) {
      devWarn(`both "fill" and width/height are set on "${src}" — fill ignores dimensions.`);
    }
    if (!fill && (width === undefined || height === undefined)) {
      devWarn(
        `missing width/height on "${src}" (causes layout shift). Provide both or use "fill".`,
      );
    }
    if (remote) {
      const host: string = new URL(src).hostname;
      if (!_remoteHosts?.includes(host)) {
        devWarn(
          `remote src "${src}" host "${host}" is not in images.remoteHosts — the proxy will 403.`,
        );
      }
    }
  }

  // Remote srcs route through the proxy automatically; local srcs pass through.
  const resolvedSrc = remote ? proxyUrl(src, quality) : src;

  const baseStyle: CSSProperties = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }
    : { maxWidth: "100%", height: "auto" };

  if (!fill && width !== undefined && height !== undefined) {
    baseStyle.aspectRatio = `${width} / ${height}`;
  }

  // Blur placeholder: a tiny base64 image rendered as a CSS background that
  // fades out once the real image loads (CSS-only — no JS island needed).
  const placeholderStyle: CSSProperties =
    placeholder === "blur" && blurDataURL
      ? {
          backgroundImage: `url(${blurDataURL})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : {};

  const imgProps: Record<string, unknown> = {
    src: resolvedSrc,
    sizes,
    className,
    style: { ...baseStyle, ...placeholderStyle, ...userStyle },
    decoding: "async",
  };

  if (fill) {
    imgProps.width = undefined;
    imgProps.height = undefined;
  } else {
    imgProps.width = width;
    imgProps.height = height;
  }

  if (priority) {
    imgProps.fetchPriority = "high";
  } else {
    imgProps.loading = "lazy";
  }

  if (remote) {
    imgProps.srcSet = SRCSET_WIDTHS.map((w) => `${proxyUrl(src, w, quality)} ${w}w`).join(", ");
  }

  // `alt` is written directly (not via spread) so the a11y linter recognizes
  // it; `alt` is required by the ImageProps type.
  const img = <img alt={alt} {...imgProps} />;

  // Format negotiation shell: a <picture> around the <img>. Format <source>
  // elements are a no-op until the proxy grows avif/webp transcoding, but the
  // element shape is stable so apps can opt in via children today.
  if (children) {
    return (
      <picture>
        {children}
        {img}
      </picture>
    );
  }
  return img;
}

export default Image;
