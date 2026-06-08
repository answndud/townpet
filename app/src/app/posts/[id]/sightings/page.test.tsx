import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";

import LostFoundSightingManagementPage, { metadata } from "@/app/posts/[id]/sightings/page";
import { getCurrentUser } from "@/server/auth";
import { redirectToProfileIfNicknameMissing } from "@/server/nickname-guard";
import { getLostFoundSightingManagementView } from "@/server/services/lost-found-sighting-management.service";

vi.mock("next/server", () => ({
  connection: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/server/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/server/nickname-guard", () => ({
  redirectToProfileIfNicknameMissing: vi.fn(),
}));

vi.mock("@/server/services/lost-found-sighting-management.service", () => ({
  getLostFoundSightingManagementView: vi.fn(),
}));

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockRedirectToProfileIfNicknameMissing = vi.mocked(redirectToProfileIfNicknameMissing);
const mockGetLostFoundSightingManagementView = vi.mocked(getLostFoundSightingManagementView);

describe("LostFoundSightingManagementPage", () => {
  beforeEach(() => {
    mockGetCurrentUser.mockReset();
    mockRedirectToProfileIfNicknameMissing.mockReset();
    mockGetLostFoundSightingManagementView.mockReset();
    mockGetCurrentUser.mockResolvedValue({
      id: "owner-1",
      nickname: "보호자",
      role: UserRole.USER,
    } as never);
    mockGetLostFoundSightingManagementView.mockResolvedValue({
      post: {
        id: "post-1",
        authorId: "owner-1",
        title: "갈색 푸들을 찾습니다",
        type: "LOST_FOUND",
        status: "ACTIVE",
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
      },
      sightings: [
        {
          id: "sighting-1",
          authorId: "guest-user",
          guestAuthorId: "guest-author-1",
          content: "공원 입구에서 봤습니다.",
          sightingLocation: "중앙공원 입구",
          sightingSeenAt: new Date("2026-05-21T10:30:00.000Z"),
          sightingImageUrl: "https://example.com/sighting.jpg",
          isPrivateSighting: true,
          createdAt: new Date("2026-05-21T10:31:00.000Z"),
          author: { id: "guest-user", nickname: null },
          guestAuthor: { id: "guest-author-1", displayName: "목격자" },
        },
      ],
      totalSightingCount: 3,
      privateSightingCount: 1,
      publicSightingCount: 2,
      latestSightingAt: new Date("2026-05-21T10:31:00.000Z"),
      isTruncated: false,
    } as never);
  });

  it("renders owner-only lost-found sighting management without collecting new contact fields", async () => {
    const html = renderToStaticMarkup(
      await LostFoundSightingManagementPage({
        params: Promise.resolve({ id: "post-1" }),
      }),
    );

    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(mockGetLostFoundSightingManagementView).toHaveBeenCalledWith({
      postId: "post-1",
      viewer: { id: "owner-1", role: UserRole.USER },
    });
    expect(html).toContain("보호자 제보 관리");
    expect(html).toContain("갈색 푸들을 찾습니다");
    expect(html).toContain("전체 제보");
    expect(html).toContain("보호자 공개");
    expect(html).toContain("공개 제보");
    expect(html).toContain("비회원 목격자");
    expect(html).toContain("중앙공원 입구");
    expect(html).toContain("공원 입구에서 봤습니다.");
    expect(html).toContain('href="/posts/post-1#comments"');
    expect(html).toContain('href="/posts/post-1#lost-found-share-tools"');
    expect(html).not.toContain("전화번호 입력");
    expect(html).not.toContain("오픈채팅 입력");
  });
});
