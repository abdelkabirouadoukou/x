import { spawn } from "node:child_process";
import { xWarn } from "./terminal.js";

/**
 * Asynchronously compiles Tailwind CSS. Used by the dev file-watcher, where
 * the server is already accepting requests — `spawn` (async) keeps the
 * single-threaded event loop free during compilation, whereas `spawnSync`
 * would block every in-flight request and live-reload socket. Pre-boot
 * compiles in `cmdDev`/`cmdBuild` (nothing serving yet) stay synchronous.
 *
 * Recompiles are serialized: at most one `bunx tailwindcss` runs at a time,
 * and saves that land mid-compile are coalesced into a single follow-up run
 * after the current one exits. Without this, a burst of CSS saves would stack
 * overlapping processes all writing the same output file (racy writes plus
 * wasted forks).
 */
let activeTailwind: { proc: ReturnType<typeof spawn>; pending: boolean } | null = null;

export function compileTailwindAsync(
  twInput: string,
  twOutput: string,
  cwd: string,
): ReturnType<typeof spawn> {
  const current = activeTailwind;
  if (current !== null) {
    current.pending = true;
    return current.proc;
  }
  const proc = spawn("bunx", ["tailwindcss", "-i", twInput, "-o", twOutput], { cwd });
  const state = { proc, pending: false };
  activeTailwind = state;
  proc.on("error", (err) => {
    xWarn(`Tailwind compilation failed: ${err.message}`);
    if (activeTailwind === state) activeTailwind = null;
  });
  proc.on("close", (code) => {
    if (code !== 0) xWarn("Tailwind compilation failed.");
    if (state.pending) {
      // The source changed again while we were compiling; run one more pass so
      // the output reflects the latest save rather than an older one.
      if (activeTailwind === state) activeTailwind = null;
      compileTailwindAsync(twInput, twOutput, cwd);
    } else if (activeTailwind === state) {
      activeTailwind = null;
    }
  });
  return proc;
}
