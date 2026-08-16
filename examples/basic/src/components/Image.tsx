// The framework ships a next/image-equivalent <Image>. This local file is kept
// as a thin re-export so existing imports of `@/components/Image` keep working;
// new code should import { Image } from "@thexjs/core" directly.

export type { ImageProps } from "@thexjs/core";
export { buildSrcSet, Image, SRCSET_WIDTHS, setImageRemoteHosts } from "@thexjs/core";
export default Image;
