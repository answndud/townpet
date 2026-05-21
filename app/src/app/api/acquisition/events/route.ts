import { NextRequest } from "next/server";

import { acquisitionEventSchema } from "@/lib/validations/acquisition-events";
import { monitorUnhandledError } from "@/server/error-monitor";
import { enforceRateLimit } from "@/server/rate-limit";
import { getClientIp } from "@/server/request-context";
import { jsonError, jsonOk } from "@/server/response";
import { recordAcquisitionEvent } from "@/server/services/acquisition-events.service";
import { ServiceError } from "@/server/services/service-error";

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);

    await enforceRateLimit({
      key: `acquisition-events:ip:${clientIp}`,
      limit: 180,
      windowMs: 60_000,
      cacheMs: 500,
      failureMode: "closed",
    });

    const body = await request.json().catch(() => null);
    const parsed = acquisitionEventSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(400, {
        code: "INVALID_INPUT",
        message: "획득 이벤트 payload가 올바르지 않습니다.",
      });
    }

    const result = await recordAcquisitionEvent(parsed.data);
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
      route: "POST /api/acquisition/events",
      request,
    });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
