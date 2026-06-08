import { NextRequest } from "next/server";

import { buildCacheControlHeader } from "@/server/cache/query-cache";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";
import {
  buildGuestFeedPageServiceResult,
  buildServerTimingHeader,
} from "@/server/services/posts/guest-feed-page.service";
import { createFeedPagePerformanceTracker } from "@/server/services/posts/feed-page-performance.service";
import { ServiceError } from "@/server/services/service-error";

const PERF_QUERY_VALUE = "1";

export async function GET(request: NextRequest) {
  try {
    const tracker = createFeedPagePerformanceTracker({
      forceLog: false,
      slowThresholdMs: 300,
    });
    const clientIp = getClientIp(request);
    await enforceRateLimit({
      key: `feed-guest:ip:${clientIp}`,
      limit: 30,
      windowMs: 60_000,
      cacheMs: 1_000,
    });

    const { searchParams } = new URL(request.url);
    const perfRequested = searchParams.get("perf") === PERF_QUERY_VALUE;
    const result = await buildGuestFeedPageServiceResult({
      searchParams,
      tracker,
      route: "/api/feed/guest",
    });
    const { perfSummary } = result;

    return jsonOk(result.data, {
      headers: {
        "cache-control": buildCacheControlHeader(30, 300),
        ...(perfRequested
          ? { "server-timing": buildServerTimingHeader(perfSummary.phases, perfSummary.totalMs) }
          : {}),
      },
      ...(perfRequested
        ? {
            meta: {
              timings: {
                totalMs: perfSummary.totalMs,
                phases: perfSummary.phases,
              },
            },
          }
        : {}),
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, { route: "GET /api/feed/guest", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
