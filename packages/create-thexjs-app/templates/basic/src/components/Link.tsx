import { Link as XLink, type LinkProps as XLinkProps } from "@thexjs/core";
import type { ReactNode } from "react";

type LinkProps = XLinkProps;

export default function Link(props: LinkProps) {
  return <XLink {...props} />;
}

export type { LinkProps };
