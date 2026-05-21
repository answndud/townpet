import {
  LostFoundStatus,
  ModerationActionType,
  ModerationTargetType,
  PostStatus,
  PostType,
  UserRole,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { lostFoundStatusUpdateSchema } from "@/lib/validations/post";
import { recordModerationAction } from "@/server/moderation-action-log";
import { assertUserInteractionAllowed } from "@/server/services/sanction.service";
import { ServiceError } from "@/server/services/service-error";
import { notifyPostCacheChange } from "./post-write-support";

type UpdateLostFoundStatusParams = {
  postId: string;
  actorId: string;
  input: unknown;
};

const AUTHOR_LOST_FOUND_STATUS_TRANSITIONS: Record<LostFoundStatus, LostFoundStatus[]> = {
  [LostFoundStatus.ACTIVE]: [LostFoundStatus.RESOLVED, LostFoundStatus.CLOSED],
  [LostFoundStatus.RESOLVED]: [LostFoundStatus.ACTIVE, LostFoundStatus.CLOSED],
  [LostFoundStatus.CLOSED]: [LostFoundStatus.ACTIVE],
};

function canAuthorTransitionLostFoundStatus(from: LostFoundStatus, to: LostFoundStatus) {
  return AUTHOR_LOST_FOUND_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

function canModerateLostFoundStatus(role: UserRole) {
  return role === UserRole.ADMIN || role === UserRole.MODERATOR;
}

export async function updateLostFoundStatus({
  postId,
  actorId,
  input,
}: UpdateLostFoundStatusParams) {
  const parsed = lostFoundStatusUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("분실동물 상태 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
  }

  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { id: true, role: true },
  });
  if (!actor) {
    throw new ServiceError("사용자를 찾을 수 없습니다.", "USER_NOT_FOUND", 404);
  }

  if (actor.role === UserRole.USER) {
    await assertUserInteractionAllowed(actor.id);
  }

  const existing = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
      status: true,
      type: true,
      lostFoundAlert: {
        select: {
          status: true,
        },
      },
    },
  });

  if (!existing || existing.status === PostStatus.DELETED) {
    throw new ServiceError("게시물을 찾을 수 없습니다.", "POST_NOT_FOUND", 404);
  }

  if (existing.type !== PostType.LOST_FOUND || !existing.lostFoundAlert) {
    throw new ServiceError("분실동물 글을 찾을 수 없습니다.", "LOST_FOUND_NOT_FOUND", 404);
  }

  const previousStatus = existing.lostFoundAlert.status;
  const nextStatus = parsed.data.status;
  if (previousStatus === nextStatus) {
    return {
      changed: false,
      previousStatus,
      status: nextStatus,
    };
  }

  const isAuthor = existing.authorId === actor.id;
  const isModerator = canModerateLostFoundStatus(actor.role);
  if (!isAuthor && !isModerator) {
    throw new ServiceError("분실동물 상태 변경 권한이 없습니다.", "FORBIDDEN", 403);
  }

  if (
    isAuthor &&
    !isModerator &&
    !canAuthorTransitionLostFoundStatus(previousStatus, nextStatus)
  ) {
    throw new ServiceError(
      "허용되지 않는 분실동물 상태 변경입니다.",
      "INVALID_LOST_FOUND_STATUS_TRANSITION",
      400,
    );
  }

  const updated = await prisma.lostFoundAlert.update({
    where: { postId },
    data: { status: nextStatus },
    select: { status: true },
  });

  await recordModerationAction({
    actorId: actor.id,
    action: ModerationActionType.LOST_FOUND_STATUS_CHANGED,
    targetType: ModerationTargetType.POST,
    targetId: existing.id,
    targetUserId: existing.authorId,
    metadata: {
      workflow: "LOST_FOUND_STATUS_CHANGED",
      previousStatus,
      nextStatus,
      actorRole: actor.role,
      actorScope: isModerator ? "MODERATOR" : "AUTHOR",
    },
  });

  notifyPostCacheChange();
  return {
    changed: true,
    previousStatus,
    status: updated.status,
  };
}
