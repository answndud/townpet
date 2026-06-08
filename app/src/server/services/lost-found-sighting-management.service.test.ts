import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommentKind, PostStatus, PostType, UserRole } from "@prisma/client";

import { getLostFoundSightingManagementSnapshot } from "@/server/queries/lost-found-sighting-management.queries";
import { getLostFoundSightingManagementView } from "@/server/services/lost-found-sighting-management.service";

vi.mock("@/server/queries/lost-found-sighting-management.queries", () => ({
  getLostFoundSightingManagementSnapshot: vi.fn(),
}));

const mockGetLostFoundSightingManagementSnapshot = vi.mocked(
  getLostFoundSightingManagementSnapshot,
);

function createSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    post: {
      id: "post-1",
      authorId: "owner-1",
      title: "갈색 푸들을 찾습니다",
      type: PostType.LOST_FOUND,
      status: PostStatus.ACTIVE,
      commentCount: 2,
      createdAt: new Date("2026-05-21T09:00:00.000Z"),
      lostFoundAlert: {
        alertType: "LOST",
        petType: "강아지",
        breed: "푸들",
        lastSeenAt: new Date("2026-05-21T08:30:00.000Z"),
        lastSeenLocation: "중앙공원 북문",
        status: "ACTIVE",
      },
      comments: [
        {
          id: "sighting-1",
          authorId: "guest-user",
          guestAuthorId: "guest-author-1",
          content: "공원 입구에서 봤습니다.",
          sightingLocation: "중앙공원 입구",
          sightingSeenAt: new Date("2026-05-21T10:30:00.000Z"),
          sightingImageUrl: null,
          isPrivateSighting: true,
          createdAt: new Date("2026-05-21T10:31:00.000Z"),
          author: { id: "guest-user", nickname: null },
          guestAuthor: { id: "guest-author-1", displayName: "목격자" },
          kind: CommentKind.LOST_FOUND_SIGHTING,
        },
      ],
    },
    sightings: [
      {
        id: "sighting-1",
        authorId: "guest-user",
        guestAuthorId: "guest-author-1",
        content: "공원 입구에서 봤습니다.",
        sightingLocation: "중앙공원 입구",
        sightingSeenAt: new Date("2026-05-21T10:30:00.000Z"),
        sightingImageUrl: null,
        isPrivateSighting: true,
        createdAt: new Date("2026-05-21T10:31:00.000Z"),
        author: { id: "guest-user", nickname: null },
        guestAuthor: { id: "guest-author-1", displayName: "목격자" },
      },
    ],
    totalSightingCount: 3,
    privateSightingCount: 1,
    isTruncated: false,
    ...overrides,
  };
}

describe("lost-found sighting management service", () => {
  beforeEach(() => {
    mockGetLostFoundSightingManagementSnapshot.mockReset();
    mockGetLostFoundSightingManagementSnapshot.mockResolvedValue(createSnapshot() as never);
  });

  it("returns normalized sighting summary for the post owner", async () => {
    const view = await getLostFoundSightingManagementView({
      postId: "post-1",
      viewer: { id: "owner-1", role: UserRole.USER },
    });

    expect(view).toMatchObject({
      totalSightingCount: 3,
      privateSightingCount: 1,
      publicSightingCount: 2,
      latestSightingAt: new Date("2026-05-21T10:31:00.000Z"),
    });
    expect(view?.sightings[0]).toMatchObject({
      id: "sighting-1",
      content: "공원 입구에서 봤습니다.",
      isPrivateSighting: true,
    });
  });

  it("allows moderators to inspect active lost-found sightings", async () => {
    const view = await getLostFoundSightingManagementView({
      postId: "post-1",
      viewer: { id: "mod-1", role: UserRole.MODERATOR },
    });

    expect(view?.post.id).toBe("post-1");
  });

  it("hides the management view from unrelated users", async () => {
    await expect(
      getLostFoundSightingManagementView({
        postId: "post-1",
        viewer: { id: "other-1", role: UserRole.USER },
      }),
    ).rejects.toMatchObject({
      code: "POST_NOT_FOUND",
      status: 404,
    });
  });

  it("does not expose non lost-found posts as sighting management targets", async () => {
    mockGetLostFoundSightingManagementSnapshot.mockResolvedValue(
      createSnapshot({
        post: {
          ...createSnapshot().post,
          type: PostType.FREE_BOARD,
          lostFoundAlert: null,
        },
      }) as never,
    );

    await expect(
      getLostFoundSightingManagementView({
        postId: "post-1",
        viewer: { id: "owner-1", role: UserRole.USER },
      }),
    ).resolves.toBeNull();
  });
});
