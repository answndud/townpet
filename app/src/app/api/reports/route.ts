import { NextRequest } from "next/server";

import { requireCurrentUser } from "@/server/auth";
import { enforceAuthenticatedWriteRateLimit } from "@/server/authenticated-write-throttle";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getClientIp } from "@/server/request-context";
import { jsonError, jsonOk } from "@/server/response";
import { ServiceError } from "@/server/services/service-error";
import { createReport } from "@/server/services/report.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await requireCurrentUser();
    const clientFingerprint = request.headers.get("x-client-fingerprint")?.trim() || undefined;
    await enforceAuthenticatedWriteRateLimit({
      scope: "report:create",
      userId: user.id,
      ip: getClientIp(request),
      clientFingerprint,
    });

    const report = await createReport({ reporterId: user.id, input: body });
    return jsonOk(report, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, { route: "POST /api/reports", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
