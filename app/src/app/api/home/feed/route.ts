import { NextRequest } from "next/server";

import { buildCacheControlHeader } from "@/server/cache/query-cache";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getHomeFeedPayload } from "@/server/queries/home-feed.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { jsonError, jsonOk } from "@/server/response";

export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    await enforceRateLimit({
      key: `home-feed:ip:${clientIp}`,
      limit: 60,
      windowMs: 60_000,
      cacheMs: 1_000,
    });

    return jsonOk(
      await getHomeFeedPayload(),
      {
        headers: {
          "cache-control": buildCacheControlHeader(60, 300),
        },
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
