import { ModerationActionType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const MODERATION_ACTION_LOG_LIMIT_DEFAULT = 50;
export const MODERATION_ACTION_LOG_LIMIT_MAX = 200;

type ModerationActionLogListOptions = {
  action?: ModerationActionType | null;
  query?: string | null;
  limit?: number;
};

type HospitalReviewFlagLogListOptions = {
  signal?: string | null;
  query?: string | null;
  limit?: number;
};

export async function listModerationActionLogs({
  action,
  query,
  limit,
}: ModerationActionLogListOptions) {
  const trimmedQuery = query?.trim();
  const safeLimit = Math.min(
    Math.max(limit ?? MODERATION_ACTION_LOG_LIMIT_DEFAULT, 1),
    MODERATION_ACTION_LOG_LIMIT_MAX,
  );

  return prisma.moderationActionLog.findMany({
    where: {
      ...(action ? { action } : {}),
      ...(trimmedQuery
        ? {
            OR: [
              { actorId: { contains: trimmedQuery, mode: "insensitive" } },
              { targetId: { contains: trimmedQuery, mode: "insensitive" } },
              { targetUserId: { contains: trimmedQuery, mode: "insensitive" } },
              { reportId: { contains: trimmedQuery, mode: "insensitive" } },
              {
                actor: {
                  OR: [
                    { email: { contains: trimmedQuery, mode: "insensitive" } },
                    { nickname: { contains: trimmedQuery, mode: "insensitive" } },
                  ],
                },
              },
              {
                targetUser: {
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
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: safeLimit,
    include: {
      actor: {
        select: {
          id: true,
          email: true,
          nickname: true,
        },
      },
      targetUser: {
        select: {
          id: true,
          email: true,
          nickname: true,
        },
      },
      report: {
        select: {
          id: true,
          targetType: true,
          targetId: true,
          status: true,
        },
      },
    },
  });
}

function extractStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function extractString(value: unknown) {
  return typeof value === "string" ? value : null;
}

export async function listHospitalReviewFlagLogs({
  signal,
  query,
  limit,
}: HospitalReviewFlagLogListOptions) {
  const trimmedQuery = query?.trim().toLowerCase() ?? "";
  const trimmedSignal = signal?.trim() ?? "";
  const safeLimit = Math.min(
    Math.max(limit ?? MODERATION_ACTION_LOG_LIMIT_DEFAULT, 1),
    MODERATION_ACTION_LOG_LIMIT_MAX,
  );

  const logs = await prisma.moderationActionLog.findMany({
    where: {
      action: ModerationActionType.HOSPITAL_REVIEW_FLAGGED,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: safeLimit * 3,
    include: {
      actor: {
        select: {
          id: true,
          email: true,
          nickname: true,
        },
      },
      targetUser: {
        select: {
          id: true,
          email: true,
          nickname: true,
        },
      },
    },
  });

  return logs
    .filter((log) => {
      const metadata = (log.metadata ?? {}) as Record<string, unknown>;
      const hospitalName = extractString(metadata.hospitalName)?.toLowerCase() ?? "";
      const signals = extractStringArray(metadata.signals);
      const actorLabel = `${log.actor.nickname ?? ""} ${log.actor.email ?? ""}`.toLowerCase();

      const matchesSignal = trimmedSignal ? signals.includes(trimmedSignal) : true;
      const matchesQuery = trimmedQuery
        ? [
            hospitalName,
            actorLabel,
            log.targetId.toLowerCase(),
            ...signals.map((entry) => entry.toLowerCase()),
          ].some((candidate) => candidate.includes(trimmedQuery))
        : true;

      return matchesSignal && matchesQuery;
    })
    .slice(0, safeLimit);
}
