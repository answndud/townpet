import { NextRequest } from "next/server";

import { normalizeWebVitalRoute } from "@/lib/web-vitals";
import { webVitalPayloadSchema } from "@/lib/validations/web-vitals";
import { monitorUnhandledError } from "@/server/error-monitor";
import { enforceRateLimit } from "@/server/rate-limit";
import { getClientIp } from "@/server/request-context";
import { jsonError, jsonOk } from "@/server/response";
import { ServiceError } from "@/server/services/service-error";
import { recordWebVitalSample } from "@/server/services/web-vitals.service";

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    await enforceRateLimit({
      key: `web-vitals:ip:${clientIp}`,
      limit: 240,
      windowMs: 60_000,
      cacheMs: 500,
      failureMode: "closed",
    });

    const body = await request.json().catch(() => null);
    const parsed = webVitalPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, {
        code: "INVALID_INPUT",
        message: "Web Vitals payload가 올바르지 않습니다.",
      });
    }

    const result = await recordWebVitalSample({
      ...parsed.data,
      route: normalizeWebVitalRoute(parsed.data.route),
    });
    if (!result.ok) {
      return jsonOk(
        {
          recorded: false,
          skippedReason: result.reason,
        },
        { status: 202 },
      );
    }

    return jsonOk({
      recorded: true,
      skippedReason: null,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, {
      route: "POST /api/metrics/web-vitals",
      request,
    });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
