import type { AnchorHTMLAttributes, ReactNode } from "react";

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
  children?: ReactNode;
  /** Use client-side navigation instead of a full page load (default: true). */
  clientNav?: boolean;
  /** Prefetch the destination on hover/focus (default: true). Requires client nav. */
  prefetch?: boolean;
}

/**
 * Framework `<Link />` — renders an anchor wired for the inline client nav script
 * (SPA transitions + hover prefetch). Opt out with `clientNav={false}` or `prefetch={false}`.
 */
export function Link({ href, children, clientNav = true, prefetch = true, ...rest }: LinkProps) {
  return (
    <a
      href={href}
      {...rest}
      {...(!clientNav ? { "data-no-nav": "" } : {})}
      {...(!prefetch ? { "data-no-prefetch": "" } : {})}
    >
      {children}
    </a>
  );
}
