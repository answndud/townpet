import { NextRequest } from "next/server";

import { runtimeEnv } from "@/lib/env";
import { webVitalsSummaryQuerySchema } from "@/lib/validations/ops/web-vitals-summary";
import { monitorUnhandledError } from "@/server/error-monitor";
import { canAccessInternalDiagnostics } from "@/server/internal-diagnostics-access";
import { getWebVitalSummary } from "@/server/queries/web-vitals.queries";
import { jsonError, jsonOk } from "@/server/response";

function canReadWebVitalsSummary(request: NextRequest) {
  return canAccessInternalDiagnostics(request, {
    configuredToken: runtimeEnv.healthInternalToken,
    isProduction: runtimeEnv.isProduction,
  });
}

function resolveSummaryStatus(summary: Awaited<ReturnType<typeof getWebVitalSummary>>) {
  if (summary.schemaSyncRequired) {
    return "SCHEMA_SYNC_REQUIRED" as const;
  }

  if (summary.rows.length === 0) {
    return "NO_SAMPLES" as const;
  }

  return "OK" as const;
}

export async function GET(request: NextRequest) {
  try {
    if (!canReadWebVitalsSummary(request)) {
      return jsonError(403, {
        code: "FORBIDDEN",
        message: "접근 권한이 없습니다.",
      });
    }

    const { searchParams } = new URL(request.url);
    const parsed = webVitalsSummaryQuerySchema.safeParse({
      days: searchParams.get("days") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return jsonError(400, {
        code: "INVALID_QUERY",
        message: "잘못된 요청 파라미터입니다.",
      });
    }

    const summary = await getWebVitalSummary(parsed.data);
    return jsonOk(
      {
        status: resolveSummaryStatus(summary),
        ...summary,
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    await monitorUnhandledError(error, {
      route: "GET /api/ops/web-vitals/summary",
      request,
    });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
