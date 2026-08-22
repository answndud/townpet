import { hashLoginIdentifierEmail } from "@/server/auth-login-identifier";
import { enforceRateLimit } from "@/server/rate-limit";

const EMAIL_IP_LIMIT = 3;
const EMAIL_IP_WINDOW_MS = 30 * 60_000;
const EMAIL_LIMIT = 5;
const EMAIL_WINDOW_MS = 24 * 60 * 60_000;
const GLOBAL_BURST_LIMIT = 100;
const GLOBAL_BURST_WINDOW_MS = 10 * 60_000;
const GLOBAL_DAILY_LIMIT = 1_000;
const GLOBAL_DAILY_WINDOW_MS = 24 * 60 * 60_000;

export function buildAuthEmailDeliveryRateLimitRules(params: {
  email: string;
  clientIp: string;
}) {
  const emailHash = hashLoginIdentifierEmail(params.email);

  return [
    {
      key: `auth:email-delivery:email-ip:${emailHash}:${params.clientIp}`,
      limit: EMAIL_IP_LIMIT,
      windowMs: EMAIL_IP_WINDOW_MS,
      failureMode: "closed" as const,
    },
    {
      key: `auth:email-delivery:email:${emailHash}`,
      limit: EMAIL_LIMIT,
      windowMs: EMAIL_WINDOW_MS,
      failureMode: "closed" as const,
    },
    {
      key: "auth:email-delivery:global:burst",
      limit: GLOBAL_BURST_LIMIT,
      windowMs: GLOBAL_BURST_WINDOW_MS,
      failureMode: "closed" as const,
    },
    {
      key: "auth:email-delivery:global:daily",
      limit: GLOBAL_DAILY_LIMIT,
      windowMs: GLOBAL_DAILY_WINDOW_MS,
      failureMode: "closed" as const,
    },
  ];
}

export async function enforceAuthEmailDeliveryRateLimit(params: {
  email: string;
  clientIp: string;
}) {
  for (const rule of buildAuthEmailDeliveryRateLimitRules(params)) {
    await enforceRateLimit(rule);
  }
}
