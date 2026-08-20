export interface AdapterOptions {
  /** Project root (defaults to process.cwd()). */
  projectRoot?: string;
  /** Matches CreateAppOptions -- same directories used by the dev/build pipeline. */
  pagesDir?: string;
  routesDir?: string;
  apiDir?: string;
  layoutsDir?: string;
  actionsDir?: string;
  contentDir?: string;
  /** Security options (CSRF, headers, rate limiting). */
  security?: Record<string, unknown>;
  /** Observability options (logging, health checks, error reporting). */
  observability?: Record<string, unknown>;
  /** Remote image proxy options for /_x/image. */
  images?: {
    remoteHosts?: string[];
  };
  /** Client build output dir. Server-mode routes' island bundles are emitted
   *  into `<islandsDir>/_islands/` here so adapters can ship them as static
   *  assets. Undefined skips island bundling (server HTML ships no island
   *  script tags). */
  islandsDir?: string;
}

/** A single file that needs to be transpiled from .ts/.tsx source into a
 *  Node-runnable .mjs module and given a stable import identifier so the
 *  generated entrypoint can `import * as X from "..."` it statically. */
export interface CompiledModuleRef {
  /** Absolute path to the original .ts/.tsx source file. */
  sourcePath: string;
  /** Absolute path to the transpiled .mjs file (inside the build scratch dir). */
  compiledPath: string;
  /** Stable JS identifier used for the static import in the generated entry file. */
  identifier: string;
}

export interface ResolvedRoute {
  routePath: string;
  paramNames: string[];
  isApi: boolean;
  mode: "static" | "server";
  revalidate?: number;
  route: CompiledModuleRef;
  layoutChain: CompiledModuleRef[];
  middlewareChain: CompiledModuleRef[];
  /** Public script URLs for the pre-bundled island hydration chunks this
   *  route needs. Empty/omitted when the route uses no islands. */
  islandScripts?: string[];
}

export interface ResolvedAction {
  parentPath: string;
  paramNames: string[];
  module: CompiledModuleRef;
  /** Client-visible function names for this action module — the names the
   *  island-bundle stub generator emits fetch() calls for. Includes each key
   *  of a batched `export const actions = {...}` plus individually-exported
   *  functions. */
  fnNames?: string[];
}

export interface BuildManifest {
  /** The project root the build ran from (used to relativize emitted paths). */
  projectRoot: string;
  pagesDirLabel: string;
  routes: ResolvedRoute[];
  actions: ResolvedAction[];
  notFound?: CompiledModuleRef;
  rootLayout?: CompiledModuleRef;
  hasServerSurface: boolean;
  /** Resolved stylesheet <link> href for server-rendered pages (baked at build time). */
  stylesheetHref?: string;
  /** Security options serialized for the generated entry. */
  security?: AdapterOptions["security"];
  /** Observability options serialized for the generated entry. */
  observability?: AdapterOptions["observability"];
  /** Remote image proxy options serialized for the generated entry. */
  images?: AdapterOptions["images"];
}
