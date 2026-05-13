import { PostStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  bumpFeedCacheVersion,
  bumpNotificationListCacheVersion,
  bumpNotificationUnreadCacheVersion,
  bumpPostCommentsCacheVersion,
  bumpPostDetailCacheVersion,
  bumpSearchCacheVersion,
  bumpSuggestCacheVersion,
} from "@/server/cache/query-cache";
import {
  attachUploadUrls,
  releaseUploadUrlsIfUnreferenced,
} from "@/server/upload-asset.service";

export const notifyPostCacheChange = () => {
  void bumpFeedCacheVersion().catch(() => undefined);
  void bumpSearchCacheVersion().catch(() => undefined);
  void bumpSuggestCacheVersion().catch(() => undefined);
  void bumpPostDetailCacheVersion().catch(() => undefined);
  void bumpPostCommentsCacheVersion().catch(() => undefined);
};

export const notifyNotificationCacheChange = (userIds: string[]) => {
  for (const userId of Array.from(new Set(userIds.filter((value) => value.length > 0)))) {
    void bumpNotificationUnreadCacheVersion(userId).catch(() => undefined);
    void bumpNotificationListCacheVersion(userId).catch(() => undefined);
  }
};

export async function softDeletePostDependents(postId: string) {
  return prisma.$transaction(async (tx) => {
    const [comments, notifications] = await Promise.all([
      tx.comment.findMany({
        where: { postId },
        select: { id: true },
      }),
      tx.notification.findMany({
        where: {
          postId,
          archivedAt: null,
        },
        select: { userId: true },
      }),
    ]);

    const commentIds = comments.map((comment) => comment.id);
    const archivedAt = new Date();

    if (commentIds.length > 0) {
      await tx.commentReaction.deleteMany({
        where: {
          commentId: { in: commentIds },
        },
      });

      await tx.comment.updateMany({
        where: { id: { in: commentIds } },
        data: {
          status: PostStatus.DELETED,
          likeCount: 0,
          dislikeCount: 0,
        },
      });
    }

    await Promise.all([
      tx.postReaction.deleteMany({
        where: { postId },
      }),
      tx.postBookmark.deleteMany({
        where: { postId },
      }),
      tx.notification.updateMany({
        where: {
          postId,
          archivedAt: null,
        },
        data: {
          archivedAt,
        },
      }),
    ]);

    const deleted = await tx.post.update({
      where: { id: postId },
      data: {
        status: PostStatus.DELETED,
        commentCount: 0,
        likeCount: 0,
        dislikeCount: 0,
      },
      select: { id: true, status: true },
    });

    return {
      deleted,
      notificationUserIds: notifications.map((notification) => notification.userId),
    };
  });
}

export async function finalizeUploadUrlChanges(params: {
  attachedUrls?: string[];
  releasedUrls?: string[];
}) {
  if (params.attachedUrls && params.attachedUrls.length > 0) {
    await attachUploadUrls(params.attachedUrls);
  }

  if (params.releasedUrls && params.releasedUrls.length > 0) {
    void releaseUploadUrlsIfUnreferenced(params.releasedUrls).catch(() => undefined);
  }
}
