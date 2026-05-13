import { PostStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { assertUserInteractionAllowed } from "@/server/services/sanction.service";
import { ServiceError } from "@/server/services/service-error";
import {
  finalizeUploadUrlChanges,
  notifyNotificationCacheChange,
  notifyPostCacheChange,
  softDeletePostDependents,
} from "./post-write-support";

type DeletePostParams = {
  postId: string;
  authorId: string;
};

export async function deletePost({ postId, authorId }: DeletePostParams) {
  await assertUserInteractionAllowed(authorId);

  const existing = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      status: true,
      authorId: true,
      images: {
        select: { url: true },
      },
    },
  });

  if (!existing || existing.status === PostStatus.DELETED) {
    throw new ServiceError("게시물을 찾을 수 없습니다.", "POST_NOT_FOUND", 404);
  }

  if (existing.authorId !== authorId) {
    throw new ServiceError("삭제 권한이 없습니다.", "FORBIDDEN", 403);
  }

  const { deleted, notificationUserIds } = await softDeletePostDependents(postId);
  await finalizeUploadUrlChanges({
    releasedUrls: (existing.images ?? []).map((image) => image.url),
  });
  notifyPostCacheChange();
  notifyNotificationCacheChange(notificationUserIds);
  return deleted;
}
