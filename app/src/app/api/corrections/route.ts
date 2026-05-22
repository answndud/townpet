import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserIdFromRequest } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getClientIp } from "@/server/request-context";
import { jsonError, jsonOk } from "@/server/response";
import { createInformationCorrectionRequest } from "@/server/services/correction-request.service";
import { ServiceError } from "@/server/services/service-error";

async function parseCorrectionRequestBody(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return {
      input: await request.json(),
      responseMode: "json" as const,
    };
  }

  const formData = await request.formData();
  return {
    input: Object.fromEntries(formData.entries()),
    responseMode: "redirect" as const,
  };
}

export async function POST(request: NextRequest) {
  let responseMode: "json" | "redirect" = "json";
  try {
    const parsedBody = await parseCorrectionRequestBody(request);
    responseMode = parsedBody.responseMode;
    const requesterUserId = await getCurrentUserIdFromRequest(request, {
      allowDemoFallback: true,
    });
    const correctionRequest = await createInformationCorrectionRequest({
      input: parsedBody.input,
      requesterUserId,
      clientIp: getClientIp(request),
    });

    if (responseMode === "redirect") {
      return NextResponse.redirect(
        new URL(`/corrections/new?submitted=${correctionRequest.id}`, request.url),
        { status: 303 },
      );
    }

    return jsonOk(correctionRequest, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      if (responseMode === "redirect") {
        const params = new URLSearchParams({
          error: error.code,
        });
        return NextResponse.redirect(new URL(`/corrections/new?${params.toString()}`, request.url), {
          status: 303,
        });
      }

      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, { route: "POST /api/corrections", request });
    if (responseMode === "redirect") {
      return NextResponse.redirect(new URL("/corrections/new?error=INTERNAL_SERVER_ERROR", request.url), {
        status: 303,
      });
    }
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
