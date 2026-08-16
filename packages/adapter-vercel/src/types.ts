import type { AdapterOptions } from "@thexjs/core/adapter";

export type {
  AdapterOptions,
  BuildManifest,
  CompiledModuleRef,
  ResolvedAction,
  ResolvedRoute,
} from "@thexjs/core/adapter";

export interface VercelAdapterOptions extends AdapterOptions {
  /** Where to emit the Build Output API v3 tree. Defaults to `<projectRoot>/.vercel/output`. */
  outputDir?: string;
  /** Vercel Node.js runtime to target. Defaults to "nodejs20.x". */
  runtime?: "nodejs18.x" | "nodejs20.x" | "nodejs22.x";
  /** Extra directories to copy verbatim into static/ (in addition to public/). */
  additionalStaticDirs?: string[];
}
