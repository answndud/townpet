import { PostReactionType, PostStatus } from "@prisma/client";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";
import {
  bumpFeedCacheVersion,
  bumpPostDetailCacheVersion,
} from "@/server/cache/query-cache";
import { getPopularPostPolicy } from "@/server/queries/policy.queries";
import { logger, serializeError } from "@/server/logger";
import { hasBlockingRelation } from "@/server/queries/user-relation.queries";
import { notifyReactionOnPost } from "@/server/services/notification.service";
import { assertUserInteractionAllowed } from "@/server/services/sanction.service";
import { ServiceError } from "@/server/services/service-error";

type TogglePostReactionParams = {
  postId: string;
  userId: string;
  type: PostReactionType | null;
};

type TogglePostReactionResult = {
  likeCount: number;
  dislikeCount: number;
  reaction: PostReactionType | null;
  previousReaction: PostReactionType | null;
};

type TogglePostBookmarkParams = {
  postId: string;
  userId: string;
  bookmarked: boolean;
};

type TogglePostBookmarkResult = {
  bookmarked: boolean;
};

type ReactionDelegateLike = {
  findUnique: (args: {
    where: { postId_userId: { postId: string; userId: string } };
    select: { id: true; type: true };
  }) => Promise<{ id: string; type: PostReactionType } | null>;
  create: (args: {
    data: { postId: string; userId: string; type: PostReactionType };
  }) => Promise<unknown>;
  update: (args: {
    where: { id: string };
    data: { type: PostReactionType };
  }) => Promise<unknown>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
  count: (args: { where: { postId: string; type: PostReactionType } }) => Promise<number>;
};

type TxLike = {
  post: {
    update: (args: {
      where: { id: string };
      data: {
        likeCount: number;
        dislikeCount: number;
        isPopular?: boolean;
        popularPromotedAt?: Date;
      };
    }) => Promise<unknown>;
  };
  postReaction?: ReactionDelegateLike;
  $queryRaw: <T = unknown>(query: TemplateStringsArray, ...values: unknown[]) => Promise<T>;
  $executeRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<number>;
};

function hasReactionDelegate(
  delegate: TxLike["postReaction"],
): delegate is ReactionDelegateLike {
  return Boolean(
    delegate &&
      typeof delegate.findUnique === "function" &&
      typeof delegate.create === "function" &&
      typeof delegate.update === "function" &&
      typeof delegate.delete === "function" &&
      typeof delegate.count === "function",
  );
}

async function togglePostReactionWithRawSql({
  tx,
  postId,
  userId,
  type,
}: {
  tx: TxLike;
  postId: string;
  userId: string;
  type: PostReactionType | null;
}): Promise<TogglePostReactionResult> {
  const now = new Date();
  const existingRows = await tx.$queryRaw<Array<{ id: string; type: string }>>`
    SELECT id, "type"::text AS type
    FROM "PostReaction"
    WHERE "postId" = ${postId} AND "userId" = ${userId}
    LIMIT 1
  `;
  const existingRow = existingRows[0];

  const previousReaction =
    existingRow?.type === PostReactionType.LIKE || existingRow?.type === PostReactionType.DISLIKE
      ? (existingRow.type as PostReactionType)
      : null;
  const reaction: PostReactionType | null = type;

  if (existingRow && type === null) {
    await tx.$executeRaw`
      DELETE FROM "PostReaction"
      WHERE id = ${existingRow.id}
    `;
  } else if (existingRow && type && existingRow.type !== type) {
    await tx.$executeRaw`
      UPDATE "PostReaction"
      SET "type" = ${type}::"PostReactionType", "updatedAt" = ${now}
      WHERE id = ${existingRow.id}
    `;
  } else if (!existingRow && type) {
    const reactionId = randomUUID().replace(/-/g, "");
    await tx.$executeRaw`
      INSERT INTO "PostReaction" ("id", "postId", "userId", "type", "createdAt", "updatedAt")
      VALUES (${reactionId}, ${postId}, ${userId}, ${type}::"PostReactionType", ${now}, ${now})
    `;
  }

  const likeCountRows = await tx.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM "PostReaction"
    WHERE "postId" = ${postId} AND "type" = 'LIKE'::"PostReactionType"
  `;
  const dislikeCountRows = await tx.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM "PostReaction"
    WHERE "postId" = ${postId} AND "type" = 'DISLIKE'::"PostReactionType"
  `;

  const likeCount = Number(likeCountRows[0]?.count ?? 0);
  const dislikeCount = Number(dislikeCountRows[0]?.count ?? 0);

  await tx.post.update({
    where: { id: postId },
    data: {
      likeCount,
      dislikeCount,
    },
  });

  return { likeCount, dislikeCount, reaction, previousReaction };
}

export async function togglePostReaction({
  postId,
  userId,
  type,
}: TogglePostReactionParams): Promise<TogglePostReactionResult> {
  await assertUserInteractionAllowed(userId);

  const existingPost = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true, authorId: true, title: true, isPopular: true },
  });

  if (!existingPost || existingPost.status === PostStatus.DELETED) {
    throw new ServiceError("게시물을 찾을 수 없습니다.", "POST_NOT_FOUND", 404);
  }

  if (await hasBlockingRelation(userId, existingPost.authorId)) {
    throw new ServiceError(
      "차단 관계에서는 반응할 수 없습니다.",
      "USER_BLOCK_RELATION",
      403,
    );
  }

  const popularPostPolicy = await getPopularPostPolicy();

  const result = await prisma.$transaction(async (tx) => {
    const txLike = tx as unknown as TxLike;
    const reactionDelegate = txLike.postReaction;

    if (!hasReactionDelegate(reactionDelegate)) {
      logger.warn(
        "Prisma tx.postReaction delegate가 불완전하여 raw SQL fallback으로 반응을 처리합니다.",
        { postId },
      );
      return togglePostReactionWithRawSql({ tx: txLike, postId, userId, type });
    }

    const existingReaction = await reactionDelegate.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
      select: { id: true, type: true },
    });

    const previousReaction = existingReaction?.type ?? null;
    const reaction: PostReactionType | null = type;

    if (existingReaction && type === null) {
      await reactionDelegate.delete({
        where: { id: existingReaction.id },
      });
    } else if (existingReaction && type && existingReaction.type !== type) {
      await reactionDelegate.update({
        where: { id: existingReaction.id },
        data: { type },
      });
    } else if (!existingReaction && type) {
      await reactionDelegate.create({
        data: {
          postId,
          userId,
          type,
        },
      });
    }

    const [likeCount, dislikeCount] = await Promise.all([
      reactionDelegate.count({
        where: { postId, type: PostReactionType.LIKE },
      }),
      reactionDelegate.count({
        where: { postId, type: PostReactionType.DISLIKE },
      }),
    ]);

    await txLike.post.update({
      where: { id: postId },
      data: {
        likeCount,
        dislikeCount,
      },
    });

    return { likeCount, dislikeCount, reaction, previousReaction };
  });

  if (!existingPost.isPopular && result.likeCount >= popularPostPolicy.minLikes) {
    await prisma.post.update({
      where: { id: postId },
      data: {
        isPopular: true,
        popularPromotedAt: new Date(),
      },
    });
  }

  if (
    result.reaction &&
    result.reaction !== result.previousReaction &&
    existingPost.authorId !== userId
  ) {
    try {
      await notifyReactionOnPost({
        recipientUserId: existingPost.authorId,
        actorId: userId,
        postId: existingPost.id,
        postTitle: existingPost.title,
        reactionType: result.reaction,
      });
    } catch (error) {
      logger.warn("게시글 반응 알림 생성에 실패했습니다.", {
        postId,
        userId,
        error: serializeError(error),
      });
    }
  }

  void bumpFeedCacheVersion().catch(() => undefined);
  void bumpPostDetailCacheVersion().catch(() => undefined);

  return result;
}

export async function togglePostBookmark({
  postId,
  userId,
  bookmarked,
}: TogglePostBookmarkParams): Promise<TogglePostBookmarkResult> {
  await assertUserInteractionAllowed(userId);

  const existingPost = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true, authorId: true },
  });

  if (!existingPost || existingPost.status === PostStatus.DELETED) {
    throw new ServiceError("게시물을 찾을 수 없습니다.", "POST_NOT_FOUND", 404);
  }

  if (await hasBlockingRelation(userId, existingPost.authorId)) {
    throw new ServiceError(
      "차단 관계에서는 저장할 수 없습니다.",
      "USER_BLOCK_RELATION",
      403,
    );
  }

  const existingBookmark = await prisma.postBookmark.findUnique({
    where: {
      postId_userId: {
        postId,
        userId,
      },
    },
    select: { id: true },
  });

  if (existingBookmark && !bookmarked) {
    await prisma.postBookmark.delete({
      where: { id: existingBookmark.id },
    });
    void bumpFeedCacheVersion().catch(() => undefined);
    void bumpPostDetailCacheVersion().catch(() => undefined);
    return { bookmarked: false };
  }

  if (!existingBookmark && bookmarked) {
    await prisma.postBookmark.create({
      data: {
        postId,
        userId,
      },
    });

    void bumpFeedCacheVersion().catch(() => undefined);
    void bumpPostDetailCacheVersion().catch(() => undefined);
    return { bookmarked: true };
  }

  return { bookmarked: Boolean(existingBookmark) };
}
