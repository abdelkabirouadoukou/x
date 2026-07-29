/**
 * Built-in `/healthz` and `/readyz` endpoints for container orchestrators
 * (Kubernetes, Docker Swarm, Railway, Fly.io) to probe process health and
 * downstream readiness (e.g. database connectivity) before routing traffic.
 */

export type HealthCheck = () => Promise<boolean> | boolean;

export interface HealthCheckOptions {
  /** Named readiness checks, e.g. { database: () => pingDb() }. All must pass for /readyz to return 200. */
  checks?: Record<string, HealthCheck>;
}

export interface ReadinessResult {
  status: "ok" | "error";
  checks: Record<string, "ok" | "error">;
}

async function runChecks(checks: Record<string, HealthCheck>): Promise<ReadinessResult> {
  const results: Record<string, "ok" | "error"> = {};
  let allOk = true;

  await Promise.all(
    Object.entries(checks).map(async ([name, check]) => {
      try {
        const ok = await check();
        results[name] = ok ? "ok" : "error";
        if (!ok) allOk = false;
      } catch {
        results[name] = "error";
        allOk = false;
      }
    }),
  );

  return { status: allOk ? "ok" : "error", checks: results };
}

/**
 * Returns a request handler that answers `/healthz` (liveness — the Bun
 * process is up and serving) and `/readyz` (readiness — all configured
 * checks pass, e.g. DB connectivity). Returns null for any other path so it
 * can be composed ahead of normal routing.
 */
export function createHealthCheckHandler(
  options: HealthCheckOptions = {},
): (req: Request) => Promise<Response | null> {
  const checks = options.checks ?? {};

  return async (req: Request) => {
    const pathname = new URL(req.url).pathname;

    if (pathname === "/healthz") {
      return Response.json({ status: "ok" }, { status: 200 });
    }

    if (pathname === "/readyz") {
      const result = await runChecks(checks);
      return Response.json(result, { status: result.status === "ok" ? 200 : 503 });
    }

    return null;
  };
}
