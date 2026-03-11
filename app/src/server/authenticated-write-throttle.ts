import { createHash } from "crypto";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/server/rate-limit";

export type AuthenticatedWriteScope =
  | "post:create"
  | "comment:create"
  | "report:create";

type AuthenticatedWriteThrottleConfig = {
  userGlobal: { limit: number; windowMs: number };
  sharedIpGlobal: { limit: number; windowMs: number };
  user: { limit: number; windowMs: number };
  userIp: { limit: number; windowMs: number };
  sharedIp: { limit: number; windowMs: number };
};

export type AuthenticatedWriteRiskLevel = "BASE" | "ELEVATED" | "HIGH";

type AuthenticatedWriteRiskProfile = {
  level: AuthenticatedWriteRiskLevel;
  reasons: string[];
};

function hashClientIp(ip: string) {
  return createHash("sha256").update(ip.trim() || "anonymous").digest("hex").slice(0, 24);
}

function hashClientFingerprint(fingerprint: string) {
  return createHash("sha256")
    .update(fingerprint.trim() || "anonymous-device")
    .digest("hex")
    .slice(0, 24);
}

const USER_GLOBAL_LIMITS: Record<AuthenticatedWriteRiskLevel, { limit: number; windowMs: number }> =
  {
    BASE: { limit: 18, windowMs: 5 * 60_000 },
    ELEVATED: { limit: 12, windowMs: 5 * 60_000 },
    HIGH: { limit: 8, windowMs: 5 * 60_000 },
  };

const SHARED_IP_GLOBAL_LIMITS: Record<
  AuthenticatedWriteRiskLevel,
  { limit: number; windowMs: number }
> = {
  BASE: { limit: 45, windowMs: 10 * 60_000 },
  ELEVATED: { limit: 28, windowMs: 10 * 60_000 },
  HIGH: { limit: 18, windowMs: 10 * 60_000 },
};

const SCOPE_LIMITS: Record<
  AuthenticatedWriteScope,
  Record<
    AuthenticatedWriteRiskLevel,
    Omit<AuthenticatedWriteThrottleConfig, "userGlobal" | "sharedIpGlobal">
  >
> = {
  "post:create": {
    BASE: {
      user: { limit: 5, windowMs: 60_000 },
      userIp: { limit: 5, windowMs: 60_000 },
      sharedIp: { limit: 12, windowMs: 10 * 60_000 },
    },
    ELEVATED: {
      user: { limit: 4, windowMs: 60_000 },
      userIp: { limit: 4, windowMs: 60_000 },
      sharedIp: { limit: 8, windowMs: 10 * 60_000 },
    },
    HIGH: {
      user: { limit: 3, windowMs: 60_000 },
      userIp: { limit: 3, windowMs: 60_000 },
      sharedIp: { limit: 5, windowMs: 10 * 60_000 },
    },
  },
  "comment:create": {
    BASE: {
      user: { limit: 10, windowMs: 60_000 },
      userIp: { limit: 10, windowMs: 60_000 },
      sharedIp: { limit: 30, windowMs: 10 * 60_000 },
    },
    ELEVATED: {
      user: { limit: 8, windowMs: 60_000 },
      userIp: { limit: 8, windowMs: 60_000 },
      sharedIp: { limit: 18, windowMs: 10 * 60_000 },
    },
    HIGH: {
      user: { limit: 5, windowMs: 60_000 },
      userIp: { limit: 5, windowMs: 60_000 },
      sharedIp: { limit: 10, windowMs: 10 * 60_000 },
    },
  },
  "report:create": {
    BASE: {
      user: { limit: 3, windowMs: 60_000 },
      userIp: { limit: 3, windowMs: 60_000 },
      sharedIp: { limit: 10, windowMs: 10 * 60_000 },
    },
    ELEVATED: {
      user: { limit: 2, windowMs: 60_000 },
      userIp: { limit: 2, windowMs: 60_000 },
      sharedIp: { limit: 6, windowMs: 10 * 60_000 },
    },
    HIGH: {
      user: { limit: 1, windowMs: 60_000 },
      userIp: { limit: 1, windowMs: 60_000 },
      sharedIp: { limit: 3, windowMs: 10 * 60_000 },
    },
  },
};

function isUserSanctionTableMissingError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
}

export async function resolveAuthenticatedWriteRiskProfile(
  userId: string,
  now = new Date(),
): Promise<AuthenticatedWriteRiskProfile> {
  const reasons: string[] = [];
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });

  if (user && now.getTime() - user.createdAt.getTime() < 7 * 24 * 60 * 60 * 1000) {
    reasons.push("new_account");
  }

  try {
    const delegate = (prisma as unknown as {
      userSanction?: {
        count(args: Prisma.UserSanctionCountArgs): Promise<number>;
      };
    }).userSanction;

    if (delegate) {
      const recentSanctionCount = await delegate.count({
        where: {
          userId,
          createdAt: { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) },
        },
      });

      if (recentSanctionCount >= 1) {
        reasons.push("recent_sanction");
      }
      if (recentSanctionCount >= 2) {
        reasons.push("repeat_sanction");
      }
    }
  } catch (error) {
    if (!isUserSanctionTableMissingError(error)) {
      throw error;
    }
  }

  if (reasons.includes("repeat_sanction")) {
    return { level: "HIGH", reasons };
  }

  if (reasons.includes("new_account") && reasons.includes("recent_sanction")) {
    return { level: "HIGH", reasons };
  }

  if (reasons.length > 0) {
    return { level: "ELEVATED", reasons };
  }

  return { level: "BASE", reasons };
}

export function buildAuthenticatedWriteThrottleConfig(params: {
  scope: AuthenticatedWriteScope;
  riskLevel: AuthenticatedWriteRiskLevel;
}): AuthenticatedWriteThrottleConfig {
  return {
    userGlobal: USER_GLOBAL_LIMITS[params.riskLevel],
    sharedIpGlobal: SHARED_IP_GLOBAL_LIMITS[params.riskLevel],
    ...SCOPE_LIMITS[params.scope][params.riskLevel],
  };
}

export async function enforceAuthenticatedWriteRateLimit(params: {
  scope: AuthenticatedWriteScope;
  userId: string;
  ip: string;
  clientFingerprint?: string | null;
}) {
  const riskProfile = await resolveAuthenticatedWriteRiskProfile(params.userId);
  const config = buildAuthenticatedWriteThrottleConfig({
    scope: params.scope,
    riskLevel: riskProfile.level,
  });
  const ipHash = hashClientIp(params.ip);
  const fingerprintHash = params.clientFingerprint?.trim()
    ? hashClientFingerprint(params.clientFingerprint)
    : null;

  await enforceRateLimit({
    key: `auth-write:user:${params.userId}`,
    limit: config.userGlobal.limit,
    windowMs: config.userGlobal.windowMs,
  });
  await enforceRateLimit({
    key: `auth-write:ip:${ipHash}`,
    limit: config.sharedIpGlobal.limit,
    windowMs: config.sharedIpGlobal.windowMs,
  });
  if (fingerprintHash) {
    await enforceRateLimit({
      key: `auth-write:fingerprint:${fingerprintHash}`,
      limit: config.sharedIpGlobal.limit,
      windowMs: config.sharedIpGlobal.windowMs,
    });
  }
  await enforceRateLimit({
    key: `${params.scope}:user:${params.userId}`,
    limit: config.user.limit,
    windowMs: config.user.windowMs,
  });
  await enforceRateLimit({
    key: `${params.scope}:user:${params.userId}:ip:${ipHash}`,
    limit: config.userIp.limit,
    windowMs: config.userIp.windowMs,
  });
  await enforceRateLimit({
    key: `${params.scope}:ip:${ipHash}`,
    limit: config.sharedIp.limit,
    windowMs: config.sharedIp.windowMs,
  });
  if (fingerprintHash) {
    await enforceRateLimit({
      key: `${params.scope}:fingerprint:${fingerprintHash}`,
      limit: config.sharedIp.limit,
      windowMs: config.sharedIp.windowMs,
    });
  }
}
