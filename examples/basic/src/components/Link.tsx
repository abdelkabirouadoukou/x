import type { ReactNode } from "react";

interface LinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  prefetch?: boolean;
}

export default function Link({ href, children, className, prefetch = true }: LinkProps) {
  return (
    <a href={href} className={className} data-no-nav={prefetch ? undefined : ""}>
      {children}
    </a>
  );
}
