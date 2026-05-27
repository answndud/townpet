import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserIdFromRequest } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getClientIp } from "@/server/request-context";
import { jsonError, jsonOk } from "@/server/response";
import { recordAcquisitionEvent } from "@/server/services/acquisition-events.service";
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

function getRedirectContextValue(input: unknown, key: "postId" | "targetType" | "targetName") {
  if (!input || typeof input !== "object" || !(key in input)) {
    return null;
  }
  const value = (input as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function buildCorrectionRedirectUrl({
  requestUrl,
  input,
  submitted,
  error,
}: {
  requestUrl: string;
  input: unknown;
  submitted?: string;
  error?: string;
}) {
  const params = new URLSearchParams();
  if (submitted) {
    params.set("submitted", submitted);
  }
  if (error) {
    params.set("error", error);
  }

  for (const key of ["postId", "targetType", "targetName"] as const) {
    const value = getRedirectContextValue(input, key);
    if (value) {
      params.set(key, key === "targetName" ? value.slice(0, 120) : value);
    }
  }

  return new URL(`/corrections/new?${params.toString()}`, requestUrl);
}

function buildCorrectionSubmittedEvent(input: unknown) {
  const postId = getRedirectContextValue(input, "postId");
  const targetType = getRedirectContextValue(input, "targetType");

  return {
    event: "CORRECTION_REQUEST_SUBMITTED",
    surface: "CORRECTION_FLOW",
    targetType: postId ? "POST" : "CTA",
    targetId: postId ?? targetType ?? "correction_request",
    source: postId ? "linked_post" : "public_form",
  } as const;
}

async function recordCorrectionSubmittedEvent(input: unknown, request: NextRequest) {
  try {
    await recordAcquisitionEvent(buildCorrectionSubmittedEvent(input));
  } catch (error) {
    await monitorUnhandledError(error, {
      route: "POST /api/corrections acquisition event",
      request,
    });
  }
}

export async function POST(request: NextRequest) {
  let responseMode: "json" | "redirect" = "json";
  let redirectInput: unknown = null;
  try {
    const parsedBody = await parseCorrectionRequestBody(request);
    responseMode = parsedBody.responseMode;
    redirectInput = parsedBody.input;
    const requesterUserId = await getCurrentUserIdFromRequest(request, {
      allowDemoFallback: true,
    });
    const correctionRequest = await createInformationCorrectionRequest({
      input: parsedBody.input,
      requesterUserId,
      clientIp: getClientIp(request),
    });
    await recordCorrectionSubmittedEvent(parsedBody.input, request);

    if (responseMode === "redirect") {
      return NextResponse.redirect(
        buildCorrectionRedirectUrl({
          requestUrl: request.url,
          input: redirectInput,
          submitted: correctionRequest.id,
        }),
        { status: 303 },
      );
    }

    return jsonOk(correctionRequest, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      if (responseMode === "redirect") {
        return NextResponse.redirect(
          buildCorrectionRedirectUrl({
            requestUrl: request.url,
            input: redirectInput,
            error: error.code,
          }),
          { status: 303 },
        );
      }

      return jsonError(error.status, {
        code: error.code,
        message: error.message,
      });
    }

    await monitorUnhandledError(error, { route: "POST /api/corrections", request });
    if (responseMode === "redirect") {
      return NextResponse.redirect(
        buildCorrectionRedirectUrl({
          requestUrl: request.url,
          input: redirectInput,
          error: "INTERNAL_SERVER_ERROR",
        }),
        { status: 303 },
      );
    }
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
