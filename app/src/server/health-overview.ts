import { Prisma } from "@prisma/client";

import { runtimeEnv, validateRuntimeEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getQueryCacheHealth } from "@/server/cache/query-cache";
import { checkModerationControlPlaneHealth } from "@/server/moderation-control-plane";
import { checkRateLimitHealth } from "@/server/rate-limit";

type CheckState = "ok" | "error";
type CheckWarningState = CheckState | "warn";

export type HealthSnapshot = Awaited<ReturnType<typeof getHealthSnapshot>>;

export async function getHealthSnapshot(options?: { includeDetailedHealth?: boolean }) {
  const includeDetailedHealth = options?.includeDetailedHealth ?? false;
  const startedAt = Date.now();
  const envValidation = validateRuntimeEnv();

  let dbState: CheckState = "ok";
  let dbMessage = "database connected";
  let pgTrgmState: CheckWarningState = "ok";
  let pgTrgmEnabled = true;
  let pgTrgmMessage = "pg_trgm extension enabled";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    dbState = "error";
    dbMessage = `database check failed: ${String(error)}`;
  }

  if (includeDetailedHealth && dbState === "ok") {
    try {
      const result = await prisma.$queryRaw<Array<{ enabled: boolean }>>(Prisma.sql`
        SELECT EXISTS(
          SELECT 1
          FROM pg_extension
          WHERE extname = 'pg_trgm'
        ) AS enabled
      `);

      pgTrgmEnabled = Boolean(result[0]?.enabled);
      if (!pgTrgmEnabled) {
        pgTrgmState = "warn";
        pgTrgmMessage =
          "pg_trgm extension missing: trigram similarity search is disabled (tsvector fallback only)";
      }
    } catch (error) {
      pgTrgmState = "warn";
      pgTrgmEnabled = false;
      pgTrgmMessage = `pg_trgm check failed: ${String(error)}`;
    }
  }

  const rateLimitState = await checkRateLimitHealth();
  const controlPlaneState = await checkModerationControlPlaneHealth();
  const queryCacheHealth = getQueryCacheHealth();
  const envState: CheckState = envValidation.ok ? "ok" : "error";
  const status: "ok" | "degraded" =
    dbState === "ok" &&
    envState === "ok" &&
    rateLimitState.status !== "error" &&
    controlPlaneState.state === "ok"
      ? "ok"
      : "degraded";

  return {
    ok: status === "ok",
    status,
    timestamp: new Date().toISOString(),
    uptimeSec: Math.floor(process.uptime()),
    durationMs: Date.now() - startedAt,
    env: {
      nodeEnv: runtimeEnv.nodeEnv,
      state: envState,
      ...(includeDetailedHealth ? { missing: envValidation.missing } : {}),
    },
    checks: {
      database: {
        state: dbState,
        ...(includeDetailedHealth ? { message: dbMessage } : {}),
      },
      rateLimit: includeDetailedHealth
        ? rateLimitState
        : {
            backend: rateLimitState.backend,
            status: rateLimitState.status,
          },
      controlPlane: includeDetailedHealth
        ? controlPlaneState
        : {
            state: controlPlaneState.state,
          },
      cache: includeDetailedHealth
        ? queryCacheHealth
        : {
            state: queryCacheHealth.state,
            backend: queryCacheHealth.backend,
          },
      ...(includeDetailedHealth && dbState === "ok"
        ? {
            search: {
              pgTrgm: {
                state: pgTrgmState,
                enabled: pgTrgmEnabled,
                message: pgTrgmMessage,
              },
            },
          }
        : {}),
    },
  };
}
