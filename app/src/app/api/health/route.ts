import { NextResponse } from "next/server";

import { runtimeEnv, validateRuntimeEnv } from "@/lib/env";
import { logger } from "@/server/logger";
import { getHealthSnapshot } from "@/server/health-overview";
import { canAccessInternalDiagnostics } from "@/server/internal-diagnostics-access";
import { createRouteTimingTracker } from "@/server/route-timing";

type PublicHealthResponse = {
  ok: boolean;
  status: "ok" | "degraded";
  timestamp: string;
};

function shouldIncludeDetailedHealth(request: Request) {
  return canAccessInternalDiagnostics(request, {
    configuredToken: runtimeEnv.healthInternalToken,
    isProduction: runtimeEnv.isProduction,
  });
}

function toPublicHealthResponse(snapshot: Awaited<ReturnType<typeof getHealthSnapshot>>): PublicHealthResponse {
  return {
    ok: snapshot.ok,
    status: snapshot.status,
    timestamp: snapshot.timestamp,
  };
}

export async function GET(request: Request) {
  const timing = createRouteTimingTracker();
  const requestUrl = new URL(request.url);
  const perfRequested = requestUrl.searchParams.get("perf") === "1";
  const envValidation = await timing.measure("env_validation", async () => validateRuntimeEnv());
  const includeDetailedHealth = await timing.measure("diagnostics_access", async () =>
    shouldIncludeDetailedHealth(request),
  );
  const snapshot = await timing.measure("health_snapshot", () =>
    getHealthSnapshot({ includeDetailedHealth }),
  );
  const status = snapshot.status;
  const httpStatus = status === "ok" ? 200 : 503;

  if (status !== "ok") {
    logger.warn("Health check degraded", {
      envMissing: envValidation.missing,
      checks: snapshot.checks,
    });
  }

  return NextResponse.json(includeDetailedHealth ? snapshot : toPublicHealthResponse(snapshot), {
    status: httpStatus,
    headers: perfRequested ? { "server-timing": timing.serverTimingHeader() } : undefined,
  });
}
