import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LostFoundStatus,
  ModerationActionType,
  PostStatus,
  PostType,
  UserRole,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { recordModerationAction } from "@/server/moderation-action-log";
import { updateLostFoundStatus } from "@/server/services/posts/post-lost-found-workflow.service";
import { assertUserInteractionAllowed } from "@/server/services/sanction.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
    },
    post: {
      findUnique: vi.fn(),
    },
    lostFoundAlert: {
      update: vi.fn(),
    },
    lostFoundStatusEvent: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/server/moderation-action-log", () => ({
  recordModerationAction: vi.fn(),
}));

vi.mock("@/server/services/sanction.service", () => ({
  assertUserInteractionAllowed: vi.fn(),
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  $transaction: ReturnType<typeof vi.fn>;
  user: { findUnique: ReturnType<typeof vi.fn> };
  post: { findUnique: ReturnType<typeof vi.fn> };
  lostFoundAlert: { update: ReturnType<typeof vi.fn> };
  lostFoundStatusEvent: { create: ReturnType<typeof vi.fn> };
};
const mockRecordModerationAction = vi.mocked(recordModerationAction);
const mockAssertUserInteractionAllowed = vi.mocked(assertUserInteractionAllowed);

describe("updateLostFoundStatus", () => {
  beforeEach(() => {
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.$transaction.mockReset();
    mockPrisma.post.findUnique.mockReset();
    mockPrisma.lostFoundAlert.update.mockReset();
    mockPrisma.lostFoundStatusEvent.create.mockReset();
    mockRecordModerationAction.mockReset();
    mockAssertUserInteractionAllowed.mockReset();
    mockAssertUserInteractionAllowed.mockResolvedValue(undefined);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "owner-1",
      role: UserRole.USER,
    });
    mockPrisma.post.findUnique.mockResolvedValue({
      id: "post-1",
      authorId: "owner-1",
      status: PostStatus.ACTIVE,
      type: PostType.LOST_FOUND,
      lostFoundAlert: {
        status: LostFoundStatus.ACTIVE,
      },
    });
    mockPrisma.lostFoundAlert.update.mockResolvedValue({
      id: "alert-1",
      status: LostFoundStatus.RESOLVED,
    });
    mockPrisma.lostFoundStatusEvent.create.mockResolvedValue({ id: "event-1" });
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        lostFoundAlert: mockPrisma.lostFoundAlert,
        lostFoundStatusEvent: mockPrisma.lostFoundStatusEvent,
      }),
    );
  });

  it("allows the post author to resolve an active lost-found alert", async () => {
    const result = await updateLostFoundStatus({
      postId: "post-1",
      actorId: "owner-1",
      input: { status: LostFoundStatus.RESOLVED },
    });

    expect(result).toEqual({
      changed: true,
      previousStatus: LostFoundStatus.ACTIVE,
      status: LostFoundStatus.RESOLVED,
    });
    expect(mockPrisma.lostFoundAlert.update).toHaveBeenCalledWith({
      where: { postId: "post-1" },
      data: { status: LostFoundStatus.RESOLVED },
      select: { id: true, status: true },
    });
    expect(mockPrisma.lostFoundStatusEvent.create).toHaveBeenCalledWith({
      data: {
        alertId: "alert-1",
        actorId: "owner-1",
        fromStatus: LostFoundStatus.ACTIVE,
        toStatus: LostFoundStatus.RESOLVED,
      },
    });
    expect(mockRecordModerationAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: ModerationActionType.LOST_FOUND_STATUS_CHANGED,
        targetId: "post-1",
        targetUserId: "owner-1",
      }),
    );
  });

  it("rejects non-author status changes", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "viewer-1",
      role: UserRole.USER,
    });

    await expect(
      updateLostFoundStatus({
        postId: "post-1",
        actorId: "viewer-1",
        input: { status: LostFoundStatus.RESOLVED },
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
  });
});
