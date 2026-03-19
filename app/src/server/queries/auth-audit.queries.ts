import { AuthAuditAction } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { hashLoginIdentifierEmail } from "@/server/auth-login-identifier";

export const AUTH_AUDIT_LOG_LIMIT_MAX = 200;
export const AUTH_AUDIT_LOG_LIMIT_DEFAULT = 50;

type AuthAuditListOptions = {
  action?: AuthAuditAction | null;
  query?: string | null;
  limit?: number;
};

export async function listAuthAuditLogs({
  action,
  query,
  limit,
}: AuthAuditListOptions) {
  const trimmedQuery = query?.trim();
  const identifierHash = trimmedQuery?.includes("@")
    ? hashLoginIdentifierEmail(trimmedQuery)
    : null;
  const safeLimit = Math.min(
    Math.max(limit ?? AUTH_AUDIT_LOG_LIMIT_DEFAULT, 1),
    AUTH_AUDIT_LOG_LIMIT_MAX,
  );

  return prisma.authAuditLog.findMany({
    where: {
      ...(action ? { action } : {}),
      ...(trimmedQuery
        ? {
            OR: [
              { userId: { contains: trimmedQuery, mode: "insensitive" } },
              ...(identifierHash ? [{ identifierHash }] : []),
              { identifierLabel: { contains: trimmedQuery, mode: "insensitive" } },
              { reasonCode: { contains: trimmedQuery, mode: "insensitive" } },
              { ipAddress: { contains: trimmedQuery, mode: "insensitive" } },
              { userAgent: { contains: trimmedQuery, mode: "insensitive" } },
              {
                user: {
                  OR: [
                    { email: { contains: trimmedQuery, mode: "insensitive" } },
                    { nickname: { contains: trimmedQuery, mode: "insensitive" } },
                  ],
                },
              },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: safeLimit,
    include: {
      user: { select: { id: true, email: true, nickname: true } },
    },
  });
}

export type AuthAuditOverview = {
  days: number;
  totalEvents: number;
  actionCounts: Record<AuthAuditAction, number>;
  topFailureReasons: Array<{
    reasonCode: string;
    count: number;
  }>;
};

export async function getAuthAuditOverview(days = 1): Promise<AuthAuditOverview> {
  const safeDays = Math.min(Math.max(days, 1), 30);
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (safeDays - 1));

  const [totalEvents, actionGroups, failureReasonGroups] = await Promise.all([
    prisma.authAuditLog.count({
      where: {
        createdAt: { gte: startDate },
      },
    }),
    prisma.authAuditLog.groupBy({
      where: {
        createdAt: { gte: startDate },
      },
      by: ["action"],
      _count: { _all: true },
      orderBy: { action: "asc" },
    }),
    prisma.authAuditLog.groupBy({
      where: {
        createdAt: { gte: startDate },
        action: {
          in: [
            AuthAuditAction.LOGIN_FAILURE,
            AuthAuditAction.LOGIN_RATE_LIMITED,
            AuthAuditAction.REGISTER_REJECTED,
            AuthAuditAction.REGISTER_RATE_LIMITED,
          ],
        },
        reasonCode: { not: null },
      },
      by: ["reasonCode"],
      _count: { _all: true },
      orderBy: { reasonCode: "asc" },
    }),
  ]);

  const actionCounts = Object.values(AuthAuditAction).reduce(
    (acc, action) => ({ ...acc, [action]: 0 }),
    {} as Record<AuthAuditAction, number>,
  );

  for (const group of actionGroups) {
    actionCounts[group.action] = group._count._all ?? 0;
  }

  return {
    days: safeDays,
    totalEvents,
    actionCounts,
    topFailureReasons: failureReasonGroups
      .filter((group): group is typeof group & { reasonCode: string } => Boolean(group.reasonCode))
      .map((group) => ({
        reasonCode: group.reasonCode,
        count: group._count._all ?? 0,
      }))
      .sort((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count;
        }
        return left.reasonCode.localeCompare(right.reasonCode);
      })
      .slice(0, 5),
  };
}
