import { createHash } from "crypto";

import {
  hashLoginIdentifierEmail,
  normalizeLoginIdentifierEmail,
} from "@/server/auth-login-identifier";
import { enforceRateLimit } from "@/server/rate-limit";
import { ServiceError } from "@/server/services/service-error";

const REGISTER_FINGERPRINT_MAX_LENGTH = 128;

export type RegisterRateLimitReasonCode =
  | "REGISTER_RATE_LIMIT_IP"
  | "REGISTER_RATE_LIMIT_FINGERPRINT"
  | "REGISTER_RATE_LIMIT_EMAIL_IP"
  | "REGISTER_RATE_LIMIT_EMAIL";

export type RegisterRateLimitRule = {
  key: string;
  limit: number;
  windowMs: number;
  reasonCode: RegisterRateLimitReasonCode;
};

function normalizeRegisterFingerprint(value: string | null | undefined) {
  return (value ?? "").trim().slice(0, REGISTER_FINGERPRINT_MAX_LENGTH);
}

function hashRegisterFingerprint(value: string | null | undefined) {
  return createHash("sha256")
    .update(normalizeRegisterFingerprint(value) || "unknown")
    .digest("hex");
}

export function buildRegisterPreValidationRateLimitRules(params: {
  clientIp: string;
  fingerprint?: string | null;
}): RegisterRateLimitRule[] {
  const rules: RegisterRateLimitRule[] = [
    {
      key: `auth:register:ip:${params.clientIp}`,
      limit: 6,
      windowMs: 10 * 60_000,
      reasonCode: "REGISTER_RATE_LIMIT_IP",
    },
  ];

  const normalizedFingerprint = normalizeRegisterFingerprint(params.fingerprint);
  if (normalizedFingerprint) {
    rules.push({
      key: `auth:register:fingerprint:${hashRegisterFingerprint(normalizedFingerprint)}`,
      limit: 4,
      windowMs: 10 * 60_000,
      reasonCode: "REGISTER_RATE_LIMIT_FINGERPRINT",
    });
  }

  return rules;
}

export function buildRegisterValidatedRateLimitRules(params: {
  email: string;
  clientIp: string;
}): RegisterRateLimitRule[] {
  const normalizedEmail = normalizeLoginIdentifierEmail(params.email);
  const emailHash = hashLoginIdentifierEmail(normalizedEmail || "unknown");

  return [
    {
      key: `auth:register:email-ip:${emailHash}:${params.clientIp}`,
      limit: 3,
      windowMs: 30 * 60_000,
      reasonCode: "REGISTER_RATE_LIMIT_EMAIL_IP",
    },
    {
      key: `auth:register:email:${emailHash}`,
      limit: 5,
      windowMs: 24 * 60 * 60_000,
      reasonCode: "REGISTER_RATE_LIMIT_EMAIL",
    },
  ];
}

export async function enforceRegisterRateLimitRules(rules: RegisterRateLimitRule[]) {
  for (const rule of rules) {
    try {
      await enforceRateLimit(rule);
    } catch (error) {
      if (error instanceof ServiceError && error.code === "RATE_LIMITED") {
        return {
          limited: true as const,
          reasonCode: rule.reasonCode,
        };
      }

      throw error;
    }
  }

  return {
    limited: false as const,
  };
}
