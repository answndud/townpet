import { NextRequest } from "next/server";

import { registerSchema } from "@/lib/validations/auth";
import { recordAuthAuditEvent } from "@/server/auth-audit-log";
import {
  buildRegisterPreValidationRateLimitRules,
  buildRegisterValidatedRateLimitRules,
  enforceRegisterRateLimitRules,
} from "@/server/auth-register-rate-limit";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getClientIp } from "@/server/request-context";
import { sendVerificationEmail } from "@/server/email";
import { jsonError, jsonOk } from "@/server/response";
import { registerUser, requestEmailVerification } from "@/server/services/auth.service";
import { ServiceError } from "@/server/services/service-error";

const INVALID_REGISTER_INPUT_RESPONSE = {
  code: "INVALID_INPUT",
  message: "회원가입 입력값이 올바르지 않습니다.",
} as const;

const RATE_LIMITED_RESPONSE = {
  code: "RATE_LIMITED",
  message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
} as const;

function toPublicRegisterError(error: ServiceError) {
  if (error.code === "EMAIL_TAKEN" || error.code === "NICKNAME_TAKEN") {
    return {
      status: 400,
      code: "REGISTER_REJECTED",
      message: "회원가입 정보를 확인해 주세요.",
    } as const;
  }

  if (error.code === "RESERVED_LOGIN_IDENTIFIER") {
    return {
      status: 400,
      code: error.code,
      message: error.message,
    } as const;
  }

  return {
    status: error.status,
    code: error.code,
    message: error.message,
  } as const;
}

function resolveRegisterRequestMeta(request: NextRequest) {
  return {
    clientIp: getClientIp(request),
    userAgent: request.headers.get("user-agent")?.trim().slice(0, 512) || null,
    fingerprint:
      request.headers.get("x-client-fingerprint")?.trim() ||
      request.headers.get("x-guest-fingerprint")?.trim() ||
      undefined,
  };
}

function extractRequestEmail(body: unknown) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const email = (body as { email?: unknown }).email;
  return typeof email === "string" ? email : null;
}

export async function POST(request: NextRequest) {
  const { clientIp, userAgent, fingerprint } = resolveRegisterRequestMeta(request);
  let auditEmail: string | null = null;

  try {
    const preValidationRateLimit = await enforceRegisterRateLimitRules(
      buildRegisterPreValidationRateLimitRules({
        clientIp,
        fingerprint,
      }),
    );
    if (preValidationRateLimit.limited) {
      await recordAuthAuditEvent({
        action: "REGISTER_RATE_LIMITED",
        ipAddress: clientIp,
        userAgent,
        reasonCode: preValidationRateLimit.reasonCode,
      });
      return jsonError(429, RATE_LIMITED_RESPONSE);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      await recordAuthAuditEvent({
        action: "REGISTER_REJECTED",
        ipAddress: clientIp,
        userAgent,
        reasonCode: "INVALID_JSON",
      });
      return jsonError(400, INVALID_REGISTER_INPUT_RESPONSE);
    }

    auditEmail = extractRequestEmail(body);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      await recordAuthAuditEvent({
        action: "REGISTER_REJECTED",
        email: auditEmail,
        ipAddress: clientIp,
        userAgent,
        reasonCode: "INVALID_INPUT",
      });
      return jsonError(400, INVALID_REGISTER_INPUT_RESPONSE);
    }

    auditEmail = parsed.data.email;
    const validatedRateLimit = await enforceRegisterRateLimitRules(
      buildRegisterValidatedRateLimitRules({
        email: parsed.data.email,
        clientIp,
      }),
    );
    if (validatedRateLimit.limited) {
      await recordAuthAuditEvent({
        action: "REGISTER_RATE_LIMITED",
        email: parsed.data.email,
        ipAddress: clientIp,
        userAgent,
        reasonCode: validatedRateLimit.reasonCode,
      });
      return jsonError(429, RATE_LIMITED_RESPONSE);
    }

    const user = await registerUser({ input: parsed.data });
    await recordAuthAuditEvent({
      action: "REGISTER_SUCCESS",
      userId: user.id,
      email: user.email,
      ipAddress: clientIp,
      userAgent,
    });
    const verification = await requestEmailVerification({
      input: { email: user.email },
    });

    if (verification.token) {
      await sendVerificationEmail({ email: user.email, token: verification.token });
    }

    return jsonOk(user, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      if (
        error.code === "EMAIL_TAKEN" ||
        error.code === "NICKNAME_TAKEN" ||
        error.code === "RESERVED_LOGIN_IDENTIFIER"
      ) {
        await recordAuthAuditEvent({
          action: "REGISTER_REJECTED",
          email: auditEmail,
          ipAddress: clientIp,
          userAgent,
          reasonCode: error.code,
        });
      }

      const publicError = toPublicRegisterError(error);
      return jsonError(publicError.status, {
        code: publicError.code,
        message: publicError.message,
      });
    }

    await monitorUnhandledError(error, { route: "POST /api/auth/register", request });
    return jsonError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 오류가 발생했습니다.",
    });
  }
}
