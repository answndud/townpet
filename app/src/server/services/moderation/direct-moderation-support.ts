import {
  ModerationActionType,
  PostStatus,
  Prisma,
  SanctionLevel,
  UserRole,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { type DirectModerationExecutionMode } from "@/lib/validations/direct-moderation";
import {
  bumpFeedCacheVersion,
  bumpPostCommentsCacheVersion,
  bumpPostDetailCacheVersion,
  bumpSearchCacheVersion,
  bumpSuggestCacheVersion,
} from "@/server/cache/query-cache";
import { findUserByEmailInsensitive } from "@/server/queries/user.queries";
import { ServiceError } from "@/server/services/service-error";

export const DIRECT_HIDE_USER_CONTENT_SOURCE_ACTION = "DIRECT_HIDE_USER_CONTENT";
export const DIRECT_RESTORE_USER_CONTENT_SOURCE_ACTION = "DIRECT_RESTORE_USER_CONTENT";
export const DIRECT_POST_VISIBILITY_TOGGLE_SOURCE_ACTION = "DIRECT_POST_VISIBILITY_TOGGLE";
export const AUTOMATED_SANCTION_MAX_LEVEL = SanctionLevel.SUSPEND_7D;

export const DIRECT_MODERATION_TARGET_USER_SELECT = {
  id: true,
  email: true,
  nickname: true,
  role: true,
} satisfies Prisma.UserSelect;

type DirectModerationTargetUser = Prisma.UserGetPayload<{
  select: typeof DIRECT_MODERATION_TARGET_USER_SELECT;
}>;

export type DirectModerationTargetUserSummary = {
  id: string;
  email: string;
  nickname: string | null;
  role: UserRole;
};

export const DIRECT_MODERATION_TARGET_POST_SELECT = {
  id: true,
  title: true,
  status: true,
  authorId: true,
  author: { select: DIRECT_MODERATION_TARGET_USER_SELECT },
} satisfies Prisma.PostSelect;

export type DirectModerationTargetPost = Prisma.PostGetPayload<{
  select: typeof DIRECT_MODERATION_TARGET_POST_SELECT;
}>;

export type DirectModerationTargetPostSummary = {
  id: string;
  title: string;
  status: PostStatus;
};

export function buildContentCreatedAtFilter(scope: "LAST_24H" | "LAST_7D" | "ALL_ACTIVE") {
  if (scope === "ALL_ACTIVE") return undefined;
  const now = Date.now();
  const windowMs = scope === "LAST_24H" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  return { gte: new Date(now - windowMs) };
}

export function summarizeTargetUser(user: DirectModerationTargetUser): DirectModerationTargetUserSummary {
  return { id: user.id, email: user.email, nickname: user.nickname, role: user.role };
}

export function summarizeTargetPost(post: DirectModerationTargetPost): DirectModerationTargetPostSummary {
  return { id: post.id, title: post.title, status: post.status };
}

export async function resolveDirectModerationTargetUser(userKey: string) {
  if (userKey.includes("@")) {
    return findUserByEmailInsensitive(userKey, DIRECT_MODERATION_TARGET_USER_SELECT);
  }
  return prisma.user.findUnique({ where: { id: userKey }, select: DIRECT_MODERATION_TARGET_USER_SELECT });
}

export function assertDirectModerationTarget(targetUser: DirectModerationTargetUser, moderatorId: string) {
  if (targetUser.id === moderatorId) {
    throw new ServiceError("자기 자신은 직접 모더레이션 대상으로 처리할 수 없습니다.", "INVALID_TARGET", 400);
  }
  if (targetUser.role !== UserRole.USER) {
    throw new ServiceError("직접 모더레이션 도구는 일반 사용자 계정에만 사용할 수 있습니다.", "DIRECT_MODERATION_USER_ONLY", 403);
  }
}

export async function bumpModerationTargetCaches() {
  await Promise.allSettled([
    bumpFeedCacheVersion(),
    bumpPostCommentsCacheVersion(),
    bumpPostDetailCacheVersion(),
    bumpSearchCacheVersion(),
    bumpSuggestCacheVersion(),
  ]);
}

export function isAutomatedModerationExecution(mode: DirectModerationExecutionMode) {
  return mode === "AUTOMATED";
}

export function buildDirectModerationReasonLabel(mode: DirectModerationExecutionMode, reason: string) {
  return `직접 모더레이션(${mode === "MANUAL" ? "수동" : "자동"}): ${reason}`;
}

export function assertDirectModerationApprovalRequired(params: {
  executionMode: DirectModerationExecutionMode;
  message: string;
}) {
  if (!isAutomatedModerationExecution(params.executionMode)) return;
  throw new ServiceError(params.message, "MODERATION_APPROVAL_REQUIRED", 409);
}

function extractModerationSourceAction(metadata: Prisma.JsonValue | null | undefined) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  if (!("sourceAction" in metadata)) return null;
  return typeof metadata.sourceAction === "string" ? metadata.sourceAction : null;
}

function buildLatestModerationActionMap(logs: Array<{
  targetId: string;
  action: ModerationActionType;
  metadata: Prisma.JsonValue | null;
}>) {
  const latestByTargetId = new Map<string, { action: ModerationActionType; sourceAction: string | null }>();
  for (const log of logs) {
    if (latestByTargetId.has(log.targetId)) continue;
    latestByTargetId.set(log.targetId, {
      action: log.action,
      sourceAction: extractModerationSourceAction(log.metadata),
    });
  }
  return latestByTargetId;
}

export async function listRestorableTargetIds(params: {
  tx: Prisma.TransactionClient;
  targetType: "POST" | "COMMENT";
  targetIds: string[];
}) {
  if (params.targetIds.length === 0) return [];
  const logs = await params.tx.moderationActionLog.findMany({
    where: {
      targetType: params.targetType,
      targetId: { in: params.targetIds },
      action: { in: [ModerationActionType.TARGET_HIDDEN, ModerationActionType.TARGET_UNHIDDEN] },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { targetId: true, action: true, metadata: true },
  });
  const latestByTargetId = buildLatestModerationActionMap(logs);
  return params.targetIds.filter((targetId) => {
    const latest = latestByTargetId.get(targetId);
    return latest?.action === ModerationActionType.TARGET_HIDDEN &&
      latest.sourceAction === DIRECT_HIDE_USER_CONTENT_SOURCE_ACTION;
  });
}
