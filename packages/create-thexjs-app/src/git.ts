import { spawnSync } from "node:child_process";

export interface GitInitResult {
  ok: boolean;
  message: string;
}

const GENERIC_FAILURE = "Git could not be initialized (is git installed?)";

// Force the default branch to "main" regardless of the user's local
// `init.defaultBranch` config (which may otherwise default to master).
export function initGitRepo(cwd: string, env?: NodeJS.ProcessEnv): GitInitResult {
  const result = spawnSync("git", ["init", "-q", "-b", "main"], {
    cwd,
    stdio: ["ignore", "ignore", "pipe"],
    env: env ?? process.env,
  });
  if (result.status === 0) {
    return { ok: true, message: "Git repository initialized on main" };
  }
  const stderr = result.stderr?.toString().trim() ?? "";
  const firstLine =
    stderr
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? "";
  if (!firstLine) return { ok: false, message: GENERIC_FAILURE };
  return { ok: false, message: `Git could not be initialized: ${firstLine}` };
}
