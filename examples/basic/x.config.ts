import { defineConfig } from "@thexjs/core";

export default defineConfig({
  pagesDir: "src/pages",
  layoutsDir: "src/layouts",
  apiDir: "src/api",
  actionsDir: "src/actions",
  contentDir: "content",
  port: 3000,
  images: {
    // Hosts allowed through the remote-image proxy at /_x/image?url=... and
    // auto-routed by the <Image> component. Add the hosts you self-host
    // images from; remote <Image src> hosts missing from this list 403.
    remoteHosts: [],
  },
});
