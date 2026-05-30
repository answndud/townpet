import { NextRequest } from "next/server";

import { buildCacheControlHeader } from "@/server/cache/query-cache";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getHomeFeedPayload } from "@/server/queries/home-feed.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";
import { createRouteTimingTracker } from "@/server/route-timing";

export async function GET(request: NextRequest) {
  const timing = createRouteTimingTracker();
  try {
    const clientIp = getClientIp(request);
    const { searchParams } = new URL(request.url);
    const perfRequested = searchParams.get("perf") === "1";

    await timing.measure("rate_limit", () => enforceRateLimit({
      key: `home-feed:ip:${clientIp}`,
      limit: 60,
      windowMs: 60_000,
      cacheMs: 1_000,
    }));

    const payload = await timing.measure("home_feed_query", () => getHomeFeedPayload());
    const summary = timing.summary();

    return jsonOk(
      payload,
      {
        headers: {
          "cache-control": buildCacheControlHeader(60, 300),
          ...(perfRequested
            ? { "server-timing": timing.serverTimingHeader() }
            : {}),
        },
        ...(perfRequested
          ? {
              meta: {
                timings: summary,
              },
            }
          : {}),
      },
    );
  } catch (error) {
    await monitorUnhandledError(error, { route: "GET /api/home/feed", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "홈 피드를 불러오지 못했습니다.",
    });
  }
}
