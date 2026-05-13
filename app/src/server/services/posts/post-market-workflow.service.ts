import {
  MarketStatus,
  ModerationActionType,
  ModerationTargetType,
  PostStatus,
  PostType,
  UserRole,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { marketListingStatusUpdateSchema } from "@/lib/validations/post";
import { recordModerationAction } from "@/server/moderation-action-log";
import { assertUserInteractionAllowed } from "@/server/services/sanction.service";
import { ServiceError } from "@/server/services/service-error";
import { notifyPostCacheChange } from "./post-write-support";

type UpdateMarketListingStatusParams = {
  postId: string;
  actorId: string;
  input: unknown;
};

const AUTHOR_MARKET_STATUS_TRANSITIONS: Record<MarketStatus, MarketStatus[]> = {
  [MarketStatus.AVAILABLE]: [
    MarketStatus.RESERVED,
    MarketStatus.SOLD,
    MarketStatus.CANCELLED,
  ],
  [MarketStatus.RESERVED]: [
    MarketStatus.AVAILABLE,
    MarketStatus.SOLD,
    MarketStatus.CANCELLED,
  ],
  [MarketStatus.SOLD]: [],
  [MarketStatus.CANCELLED]: [],
};

function canAuthorTransitionMarketStatus(from: MarketStatus, to: MarketStatus) {
  return AUTHOR_MARKET_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

function canModerateMarketStatus(role: UserRole) {
  return role === UserRole.ADMIN || role === UserRole.MODERATOR;
}

export async function updateMarketListingStatus({
  postId,
  actorId,
  input,
}: UpdateMarketListingStatusParams) {
  const parsed = marketListingStatusUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("마켓 상태 입력값이 올바르지 않습니다.", "INVALID_INPUT", 400);
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
      marketListing: {
        select: {
          id: true,
          listingType: true,
          status: true,
        },
      },
    },
  });

  if (!existing || existing.status === PostStatus.DELETED) {
    throw new ServiceError("게시물을 찾을 수 없습니다.", "POST_NOT_FOUND", 404);
  }

  if (existing.type !== PostType.MARKET_LISTING || !existing.marketListing) {
    throw new ServiceError("마켓 글을 찾을 수 없습니다.", "MARKET_LISTING_NOT_FOUND", 404);
  }

  const previousStatus = existing.marketListing.status;
  const nextStatus = parsed.data.status;
  if (previousStatus === nextStatus) {
    return {
      changed: false,
      previousStatus,
      status: nextStatus,
    };
  }

  const isAuthor = existing.authorId === actor.id;
  const isModerator = canModerateMarketStatus(actor.role);
  if (!isAuthor && !isModerator) {
    throw new ServiceError("마켓 상태 변경 권한이 없습니다.", "FORBIDDEN", 403);
  }

  if (isAuthor && !isModerator && !canAuthorTransitionMarketStatus(previousStatus, nextStatus)) {
    throw new ServiceError("허용되지 않는 마켓 상태 변경입니다.", "INVALID_MARKET_STATUS_TRANSITION", 400);
  }

  const updated = await prisma.marketListing.update({
    where: { postId },
    data: { status: nextStatus },
    select: {
      listingType: true,
      price: true,
      condition: true,
      depositAmount: true,
      rentalPeriod: true,
      status: true,
    },
  });

  await recordModerationAction({
    actorId: actor.id,
    action: ModerationActionType.MARKET_STATUS_CHANGED,
    targetType: ModerationTargetType.POST,
    targetId: existing.id,
    targetUserId: existing.authorId,
    metadata: {
      previousStatus,
      nextStatus,
      actorRole: actor.role,
      actorScope: isModerator ? "MODERATOR" : "AUTHOR",
      listingType: existing.marketListing.listingType,
    },
  });

  notifyPostCacheChange();
  return {
    changed: true,
    previousStatus,
    status: updated.status,
    marketListing: updated,
  };
}
