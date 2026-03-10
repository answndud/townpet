import {
  NotificationEntityType,
  NotificationType,
  Prisma,
} from "@prisma/client";

import {
  createNotificationDelivery,
  deliverNotificationDelivery,
} from "@/server/queries/notification.queries";

type CreateUserNotificationParams = {
  userId: string;
  actorId?: string | null;
  type: NotificationType;
  entityType: NotificationEntityType;
  entityId: string;
  postId?: string;
  commentId?: string;
  title: string;
  body?: string;
  metadata?: Prisma.InputJsonValue;
};

type NotifyCommentOnPostParams = {
  recipientUserId: string;
  actorId: string;
  postId: string;
  commentId: string;
  postTitle: string;
  commentContent: string;
};

type NotifyReplyToCommentParams = {
  recipientUserId: string;
  actorId: string;
  postId: string;
  commentId: string;
  postTitle: string;
  replyContent: string;
};

type NotifyMentionInCommentParams = {
  recipientUserId: string;
  actorId: string;
  postId: string;
  commentId: string;
  postTitle: string;
  commentContent: string;
};

type NotifyReactionOnPostParams = {
  recipientUserId: string;
  actorId: string;
  postId: string;
  postTitle: string;
  reactionType: "LIKE" | "DISLIKE";
};

type NotifyReactionOnCommentParams = {
  recipientUserId: string;
  actorId: string;
  postId: string;
  commentId: string;
  commentContent: string;
  reactionType: "LIKE" | "DISLIKE";
};

function clampText(value: string | null | undefined, maxLength: number) {
  const trimmed = (value ?? "").trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength)}...`;
}

export async function createUserNotification({
  userId,
  actorId,
  type,
  entityType,
  entityId,
  postId,
  commentId,
  title,
  body,
  metadata,
}: CreateUserNotificationParams) {
  if (actorId && actorId === userId) {
    return null;
  }

  const safeTitle = clampText(title, 120) || "새 알림이 도착했어요";

  const delivery = await createNotificationDelivery({
    userId,
    actorId: actorId ?? null,
    type,
    entityType,
    entityId,
    postId: postId ?? null,
    commentId: commentId ?? null,
    title: safeTitle,
    body: body ? clampText(body, 220) : null,
    metadata,
  });

  try {
    await deliverNotificationDelivery(delivery.id);
  } catch {
    // The outbox row remains pending/failed for later retry paths.
  }

  return delivery;
}

export async function notifyCommentOnPost({
  recipientUserId,
  actorId,
  postId,
  commentId,
  postTitle,
  commentContent,
}: NotifyCommentOnPostParams) {
  return createUserNotification({
    userId: recipientUserId,
    actorId,
    type: NotificationType.COMMENT_ON_POST,
    entityType: NotificationEntityType.COMMENT,
    entityId: commentId,
    postId,
    commentId,
    title: `내 글에 새 댓글이 달렸어요: ${clampText(postTitle, 60)}`,
    body: clampText(commentContent, 140),
  });
}

export async function notifyReplyToComment({
  recipientUserId,
  actorId,
  postId,
  commentId,
  postTitle,
  replyContent,
}: NotifyReplyToCommentParams) {
  return createUserNotification({
    userId: recipientUserId,
    actorId,
    type: NotificationType.REPLY_TO_COMMENT,
    entityType: NotificationEntityType.COMMENT,
    entityId: commentId,
    postId,
    commentId,
    title: `내 댓글에 답글이 달렸어요: ${clampText(postTitle, 60)}`,
    body: clampText(replyContent, 140),
  });
}

export async function notifyMentionInComment({
  recipientUserId,
  actorId,
  postId,
  commentId,
  postTitle,
  commentContent,
}: NotifyMentionInCommentParams) {
  return createUserNotification({
    userId: recipientUserId,
    actorId,
    type: NotificationType.MENTION_IN_COMMENT,
    entityType: NotificationEntityType.COMMENT,
    entityId: commentId,
    postId,
    commentId,
    title: `댓글에서 나를 언급했어요: ${clampText(postTitle, 60)}`,
    body: clampText(commentContent, 140),
  });
}

export async function notifyReactionOnPost({
  recipientUserId,
  actorId,
  postId,
  postTitle,
  reactionType,
}: NotifyReactionOnPostParams) {
  return createUserNotification({
    userId: recipientUserId,
    actorId,
    type: NotificationType.REACTION_ON_POST,
    entityType: NotificationEntityType.REACTION,
    entityId: postId,
    postId,
    title: `내 글에 ${reactionType === "LIKE" ? "좋아요" : "싫어요"}가 눌렸어요: ${clampText(postTitle, 60)}`,
    metadata: {
      reactionType,
    },
  });
}

export async function notifyReactionOnComment({
  recipientUserId,
  actorId,
  postId,
  commentId,
  commentContent,
  reactionType,
}: NotifyReactionOnCommentParams) {
  return createUserNotification({
    userId: recipientUserId,
    actorId,
    type: NotificationType.REACTION_ON_COMMENT,
    entityType: NotificationEntityType.REACTION,
    entityId: commentId,
    postId,
    commentId,
    title: `내 댓글에 ${reactionType === "LIKE" ? "좋아요" : "싫어요"}가 눌렸어요`,
    body: clampText(commentContent, 140),
    metadata: {
      reactionType,
    },
  });
}
