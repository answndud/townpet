import { NextResponse } from "next/server";

import { runtimeEnv, validateRuntimeEnv } from "@/lib/env";
import { logger } from "@/server/logger";
import { getHealthSnapshot } from "@/server/health-overview";

function resolveBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader) {
    return "";
  }

  const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return "";
  }

  return token.trim();
}

function shouldIncludeDetailedHealth(request: Request) {
  const internalToken = runtimeEnv.healthInternalToken.trim();

  if (!internalToken) {
    return !runtimeEnv.isProduction;
  }

  const tokenFromHeader = request.headers.get("x-health-token")?.trim() ?? "";
  const tokenFromBearer = resolveBearerToken(request.headers.get("authorization"));
  const providedToken = tokenFromHeader || tokenFromBearer;

  return providedToken.length > 0 && providedToken === internalToken;
}

export async function GET(request: Request) {
  const envValidation = validateRuntimeEnv();
  const includeDetailedHealth = shouldIncludeDetailedHealth(request);
  const snapshot = await getHealthSnapshot({ includeDetailedHealth });
  const status = snapshot.status;
  const httpStatus = status === "ok" ? 200 : 503;

  if (status !== "ok") {
    logger.warn("Health check degraded", {
      envMissing: envValidation.missing,
      checks: snapshot.checks,
    });
  }

  return NextResponse.json(snapshot, { status: httpStatus });
}
