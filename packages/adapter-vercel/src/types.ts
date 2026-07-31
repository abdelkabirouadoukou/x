export interface VercelAdapterOptions {
  /** Project root (defaults to process.cwd()). */
  projectRoot?: string;
  /** Matches CreateAppOptions -- same directories used by the dev/build pipeline. */
  pagesDir?: string;
  routesDir?: string;
  apiDir?: string;
  layoutsDir?: string;
  actionsDir?: string;
  contentDir?: string;
  /** Where to emit the Build Output API v3 tree. Defaults to `<projectRoot>/.vercel/output`. */
  outputDir?: string;
  /** Vercel Node.js runtime to target. Defaults to "nodejs20.x". */
  runtime?: "nodejs18.x" | "nodejs20.x" | "nodejs22.x";
  /** Extra directories to copy verbatim into static/ (in addition to public/). */
  additionalStaticDirs?: string[];
  /** Security options (CSRF, headers, rate limiting). */
  security?: {
    csrf?: { allowedOrigins?: string[]; requireToken?: boolean; disabled?: boolean };
    headers?:
      | {
          contentSecurityPolicy?: string | false;
          hstsMaxAge?: number | false;
          hstsIncludeSubDomains?: boolean;
          frameOptions?: string | false;
          contentTypeOptions?: string | false;
          referrerPolicy?: string | false;
        }
      | false;
    rateLimit?: { limit?: number; windowMs?: number } | false;
  };
  /** Observability options (logging, health checks, error reporting). */
  observability?: {
    /** Structured JSON logging. Default: true. */
    logging?: boolean;
  };
  /** Remote image proxy options for /_x/image. */
  images?: {
    /** Hostnames allowed to be proxied, e.g. ["cdn.example.com"]. */
    remoteHosts?: string[];
  };
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
}

export interface ResolvedAction {
  parentPath: string;
  paramNames: string[];
  module: CompiledModuleRef;
}

export interface BuildManifest {
  pagesDirLabel: string;
  routes: ResolvedRoute[];
  actions: ResolvedAction[];
  notFound?: CompiledModuleRef;
  rootLayout?: CompiledModuleRef;
  hasServerSurface: boolean;
  /** Security options serialized for the generated entry. */
  security?: VercelAdapterOptions["security"];
  /** Observability options serialized for the generated entry. */
  observability?: VercelAdapterOptions["observability"];
  /** Remote image proxy options serialized for the generated entry. */
  images?: VercelAdapterOptions["images"];
}
