import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationEntityType, NotificationType } from "@prisma/client";

import {
  createUserNotification,
  notifyCommentOnPost,
  notifyMentionInComment,
  notifyReactionOnComment,
  notifyReactionOnPost,
} from "@/server/services/notification.service";
import {
  createNotificationDelivery,
  deliverNotificationDelivery,
} from "@/server/queries/notification.queries";

vi.mock("@/server/queries/notification.queries", () => ({
  createNotificationDelivery: vi.fn(),
  deliverNotificationDelivery: vi.fn(),
}));

const mockCreateNotificationDelivery = vi.mocked(createNotificationDelivery);
const mockDeliverNotificationDelivery = vi.mocked(deliverNotificationDelivery);

describe("notification service", () => {
  beforeEach(() => {
    mockCreateNotificationDelivery.mockReset();
    mockDeliverNotificationDelivery.mockReset();
    mockCreateNotificationDelivery.mockResolvedValue({ id: "delivery-1" } as never);
    mockDeliverNotificationDelivery.mockResolvedValue({ delivered: true } as never);
  });

  it("skips self notifications", async () => {
    const result = await createUserNotification({
      userId: "user-1",
      actorId: "user-1",
      type: NotificationType.SYSTEM,
      entityType: NotificationEntityType.SYSTEM,
      entityId: "system-1",
      title: "self",
    });

    expect(result).toBeNull();
    expect(mockCreateNotificationDelivery).not.toHaveBeenCalled();
  });

  it("clamps title and body lengths", async () => {
    await createUserNotification({
      userId: "user-2",
      actorId: "actor-1",
      type: NotificationType.SYSTEM,
      entityType: NotificationEntityType.SYSTEM,
      entityId: "system-2",
      title: "a".repeat(180),
      body: "b".repeat(300),
    });

    expect(mockCreateNotificationDelivery).toHaveBeenCalledTimes(1);
    expect(mockDeliverNotificationDelivery).toHaveBeenCalledWith("delivery-1");
    const args = mockCreateNotificationDelivery.mock.calls[0][0];
    expect(args.title.length).toBeLessThanOrEqual(123);
    expect(args.body?.length).toBeLessThanOrEqual(223);
  });

  it("creates comment notification payload", async () => {
    await notifyCommentOnPost({
      recipientUserId: "owner-1",
      actorId: "actor-1",
      postId: "post-1",
      commentId: "comment-1",
      postTitle: "강남 산책로 추천",
      commentContent: "정말 도움됐어요",
    });

    const args = mockCreateNotificationDelivery.mock.calls[0][0];
    expect(args.type).toBe(NotificationType.COMMENT_ON_POST);
    expect(args.entityId).toBe("comment-1");
    expect(args.postId).toBe("post-1");
  });

  it("creates reaction notification payload", async () => {
    await notifyReactionOnPost({
      recipientUserId: "owner-1",
      actorId: "actor-1",
      postId: "post-2",
      postTitle: "우리동네 병원 후기",
      reactionType: "DISLIKE",
    });

    const args = mockCreateNotificationDelivery.mock.calls[0][0];
    expect(args.type).toBe(NotificationType.REACTION_ON_POST);
    expect(args.entityId).toBe("post-2");
    expect(args.postId).toBe("post-2");
    expect(args.metadata).toEqual({ reactionType: "DISLIKE" });
  });

  it("creates mention notification payload", async () => {
    await notifyMentionInComment({
      recipientUserId: "owner-2",
      actorId: "actor-2",
      postId: "post-3",
      commentId: "comment-3",
      postTitle: "우리 강아지 산책 모임",
      commentContent: "@보리맘 같이 가실래요?",
    });

    const args = mockCreateNotificationDelivery.mock.calls[0][0];
    expect(args.type).toBe(NotificationType.MENTION_IN_COMMENT);
    expect(args.entityId).toBe("comment-3");
    expect(args.commentId).toBe("comment-3");
    expect(args.postId).toBe("post-3");
  });

  it("creates comment reaction notification payload", async () => {
    await notifyReactionOnComment({
      recipientUserId: "owner-3",
      actorId: "actor-3",
      postId: "post-4",
      commentId: "comment-4",
      commentContent: "좋은 정보 감사합니다",
      reactionType: "LIKE",
    });

    const args = mockCreateNotificationDelivery.mock.calls[0][0];
    expect(args.type).toBe(NotificationType.REACTION_ON_COMMENT);
    expect(args.entityId).toBe("comment-4");
    expect(args.commentId).toBe("comment-4");
    expect(args.postId).toBe("post-4");
    expect(args.metadata).toEqual({ reactionType: "LIKE" });
  });

  it("keeps queued delivery when immediate delivery attempt fails", async () => {
    mockDeliverNotificationDelivery.mockRejectedValue(new Error("temporary failure"));

    await expect(
      createUserNotification({
        userId: "user-2",
        actorId: "actor-1",
        type: NotificationType.SYSTEM,
        entityType: NotificationEntityType.SYSTEM,
        entityId: "system-3",
        title: "retry me",
      }),
    ).resolves.toEqual({ id: "delivery-1" });

    expect(mockCreateNotificationDelivery).toHaveBeenCalledTimes(1);
    expect(mockDeliverNotificationDelivery).toHaveBeenCalledWith("delivery-1");
  });
});
