import { Prisma, SanctionLevel } from "@prisma/client";

const PUBLIC_VISIBILITY_RESTRICTED_LEVELS = [
  SanctionLevel.SUSPEND_7D,
  SanctionLevel.SUSPEND_30D,
  SanctionLevel.PERMANENT_BAN,
] as const;

export function buildActiveVisibilitySanctionWhere(now = new Date()): Prisma.UserSanctionWhereInput {
  return {
    level: { in: [...PUBLIC_VISIBILITY_RESTRICTED_LEVELS] },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

export function buildVisibleAuthorFilter(now = new Date()): Prisma.UserWhereInput {
  return {
    sanctionsReceived: {
      none: buildActiveVisibilitySanctionWhere(now),
    },
  };
}
