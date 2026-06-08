import { PostScope, PostStatus, PostType } from "@prisma/client";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/feed/guest/route";
import { ServiceError } from "@/server/services/service-error";
import { monitorUnhandledError } from "@/server/error-monitor";
import { listCommunityNavItems } from "@/server/queries/community.queries";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import {
  countPosts,
  countBestPosts,
  listBestPosts,
  listPosts,
} from "@/server/queries/post.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import {
  filterRenderableUploadImages,
  resolveRenderableUploadPathnames,
} from "@/server/upload-renderable-assets";

vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/community.queries", () => ({ listCommunityNavItems: vi.fn() }));
vi.mock("@/server/queries/policy.queries", () => ({
  getGuestReadLoginRequiredPostTypes: vi.fn(),
}));
vi.mock("@/server/queries/post.queries", () => ({
  countPosts: vi.fn(),
  countBestPosts: vi.fn(),
  listBestPosts: vi.fn(),
  listPosts: vi.fn(),
}));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("@/server/upload-renderable-assets", () => ({
  filterRenderableUploadImages: vi.fn((images, renderableUploadPathnames) =>
    images.filter((image: { url?: string | null }) => {
      const url = image.url ?? "";
      if (!url.startsWith("/media/uploads/")) {
        return Boolean(url);
      }
      return renderableUploadPathnames.has(url.slice("/media/".length));
    }),
  ),
  resolveRenderableUploadPathnames: vi.fn(),
}));

const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockListCommunityNavItems = vi.mocked(listCommunityNavItems);
const mockGetGuestReadLoginRequiredPostTypes = vi.mocked(getGuestReadLoginRequiredPostTypes);
const mockCountPosts = vi.mocked(countPosts);
const mockCountBestPosts = vi.mocked(countBestPosts);
const mockListBestPosts = vi.mocked(listBestPosts);
const mockListPosts = vi.mocked(listPosts);
const mockGetClientIp = vi.mocked(getClientIp);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockFilterRenderableUploadImages = vi.mocked(filterRenderableUploadImages);
const mockResolveRenderableUploadPathnames = vi.mocked(resolveRenderableUploadPathnames);

describe("GET /api/feed/guest", () => {
  beforeEach(() => {
    mockMonitorUnhandledError.mockReset();
    mockListCommunityNavItems.mockReset();
    mockGetGuestReadLoginRequiredPostTypes.mockReset();
    mockCountPosts.mockReset();
    mockCountBestPosts.mockReset();
    mockListBestPosts.mockReset();
    mockListPosts.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();
    mockFilterRenderableUploadImages.mockClear();
    mockResolveRenderableUploadPathnames.mockReset();

    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockListCommunityNavItems.mockResolvedValue([
      { id: "c000000000000000000000201", slug: "dog", labelKo: "강아지" },
      { id: "c000000000000000000000202", slug: "cat", labelKo: "고양이" },
    ]);
    mockGetGuestReadLoginRequiredPostTypes.mockResolvedValue([]);
    mockCountPosts.mockResolvedValue(0);
    mockCountBestPosts.mockResolvedValue(0);
    mockListBestPosts.mockResolvedValue([]);
    mockResolveRenderableUploadPathnames.mockResolvedValue(new Set());
  });

  it("returns guest feed payload with public cache headers", async () => {
    mockListPosts.mockResolvedValue({
      items: [
        {
          id: "post-1",
          type: PostType.FREE_BOARD,
          scope: PostScope.GLOBAL,
          status: PostStatus.ACTIVE,
          title: "강아지 산책 코스 추천",
          content: "산책하기 좋은 공원이에요.",
          commentCount: 1,
          likeCount: 2,
          dislikeCount: 0,
          viewCount: 10,
          createdAt: new Date("2026-03-06T08:00:00.000Z"),
          author: {
            id: "user-1",
            name: "alex",
            nickname: "알렉스",
            image: null,
          },
          guestAuthorId: "guest-author-1",
          guestDisplayName: "비회원",
          guestIpDisplay: "203.0.113",
          guestIpLabel: "아이피",
          neighborhood: null,
          petType: null,
          images: [],
          reactions: [],
        },
      ],
      nextCursor: null,
    } as never);

    const response = await GET(new Request("http://localhost/api/feed/guest") as NextRequest);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, s-maxage=30, stale-while-revalidate=300");
    expect(mockEnforceRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ key: "feed-guest:ip:127.0.0.1", limit: 30 }),
    );
    expect(payload.ok).toBe(true);
    expect(payload.data.view).toBe("feed");
    expect(payload.data.feed.selectedSort).toBe("LATEST");
    expect(payload.data.feed.items).toHaveLength(1);
    expect(payload.data.feed.items[0]).toMatchObject({
      guestAuthorId: "guest-author-1",
      guestDisplayName: "비회원",
    });
    expect(payload.data.feed.items[0]).not.toHaveProperty("guestIpDisplay");
    expect(payload.data.feed.items[0]).not.toHaveProperty("guestIpLabel");
    expect(mockCountPosts).not.toHaveBeenCalled();
  });

  it("includes timings meta and server-timing header when perf=1 is requested", async () => {
    mockListPosts.mockResolvedValue({
      items: [],
      nextCursor: null,
    } as never);

    const response = await GET(
      new Request("http://localhost/api/feed/guest?perf=1") as NextRequest,
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("server-timing")).toContain("bootstrap.policy");
    expect(response.headers.get("server-timing")).toContain("page_query.all");
    expect(payload.meta).toEqual({
      timings: {
        totalMs: expect.any(Number),
        phases: expect.objectContaining({
          "bootstrap.policy": expect.any(Number),
          "page_query.all": expect.any(Number),
        }),
      },
    });
    expect(mockCountPosts).not.toHaveBeenCalled();
    expect(mockListCommunityNavItems).not.toHaveBeenCalled();
  });

  it("returns gate payload for local-only board types", async () => {
    const response = await GET(
      new Request("http://localhost/api/feed/guest?type=MEETUP") as NextRequest,
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: {
        view: "gate",
        gate: {
          title: "로그인 후 이용할 수 있습니다.",
          description: "동네 모임은 동네 설정 후 볼 수 있습니다. 로그인 후 대표 동네를 설정해 주세요.",
          primaryLink: "/login?next=%2Ffeed%3Ftype%3DMEETUP",
          primaryLabel: "로그인하기",
          secondaryLink: "/feed",
          secondaryLabel: "전체 피드",
        },
      },
    });
    expect(mockListPosts).not.toHaveBeenCalled();
  });

  it("uses Korean labels in guest feed titles", async () => {
    mockCountPosts.mockResolvedValue(0);
    mockListPosts.mockResolvedValue({
      items: [],
      nextCursor: null,
    } as never);

    const lostFoundResponse = await GET(
      new Request("http://localhost/api/feed/guest?type=LOST_FOUND") as NextRequest,
    );
    const lostFoundPayload = await lostFoundResponse.json();

    expect(lostFoundResponse.status).toBe(200);
    expect(lostFoundPayload.data.feed.feedTitle).toBe("실종/목격 제보 게시판");

    const hospitalResponse = await GET(
      new Request("http://localhost/api/feed/guest?type=HOSPITAL_REVIEW") as NextRequest,
    );
    const hospitalPayload = await hospitalResponse.json();

    expect(hospitalResponse.status).toBe(200);
    expect(hospitalPayload.data.feed.feedTitle).toBe("병원 후기 게시판");
  });

  it("returns compact cursor payload for guest infinite scroll", async () => {
    mockListPosts.mockResolvedValue({
      items: [
        {
          id: "post-2",
          type: PostType.FREE_BOARD,
          scope: PostScope.GLOBAL,
          status: PostStatus.ACTIVE,
          title: "두 번째 글",
          content: "무한 스크롤 다음 페이지",
          commentCount: 0,
          likeCount: 1,
          dislikeCount: 0,
          viewCount: 3,
          createdAt: new Date("2026-03-06T09:00:00.000Z"),
          author: {
            id: "user-2",
            name: "sam",
            nickname: "샘",
            image: null,
          },
          neighborhood: null,
          petType: null,
          images: [],
          reactions: [],
        },
      ],
      nextCursor: "post-3",
    } as never);

    const response = await GET(
      new Request("http://localhost/api/feed/guest?cursor=post-1") as NextRequest,
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: {
        items: [
          expect.objectContaining({
            id: "post-2",
            title: "두 번째 글",
          }),
        ],
        nextCursor: "post-3",
      },
    });
    expect(mockListCommunityNavItems).not.toHaveBeenCalled();
    expect(mockListPosts).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: "post-1",
        sort: "LATEST",
      }),
    );
  });

  it("serializes lost-found alert data for guest feed rows", async () => {
    mockListPosts.mockResolvedValue({
      items: [
        {
          id: "lost-found-1",
          type: PostType.LOST_FOUND,
          scope: PostScope.GLOBAL,
          status: PostStatus.ACTIVE,
          title: "망원동 강아지 목격 제보",
          content: "공원 북문 근처에서 목격했어요.",
          commentCount: 0,
          likeCount: 2,
          dislikeCount: 0,
          viewCount: 8,
          createdAt: new Date("2026-05-24T11:00:00.000Z"),
          author: {
            id: "user-lost",
            name: "lost",
            nickname: "제보자",
            image: null,
          },
          guestAuthorId: null,
          guestDisplayName: null,
          neighborhood: null,
          petType: null,
          images: [],
          lostFoundAlert: {
            alertType: "FOUND",
            petType: "강아지",
            breed: "말티즈",
            lastSeenAt: new Date("2026-05-24T10:30:00.000Z"),
            lastSeenLocation: "망원동 공원 북문",
            status: "ACTIVE",
          },
          reactions: [],
        },
      ],
      nextCursor: null,
    } as never);

    const response = await GET(
      new Request("http://localhost/api/feed/guest?type=LOST_FOUND") as NextRequest,
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.feed.items[0].lostFoundAlert).toEqual({
      alertType: "FOUND",
      petType: "강아지",
      breed: "말티즈",
      lastSeenAt: "2026-05-24T10:30:00.000Z",
      lastSeenLocation: "망원동 공원 북문",
      status: "ACTIVE",
    });
  });

  it("removes missing upload thumbnails from guest feed payloads", async () => {
    mockResolveRenderableUploadPathnames.mockResolvedValue(new Set(["uploads/renderable.webp"]));
    mockListPosts.mockResolvedValue({
      items: [
        {
          id: "post-image-filter",
          type: PostType.FREE_BOARD,
          scope: PostScope.GLOBAL,
          status: PostStatus.ACTIVE,
          title: "이미지 포함 글",
          content: "깨진 이미지가 목록에 나오면 안 됩니다.",
          commentCount: 0,
          likeCount: 0,
          dislikeCount: 0,
          viewCount: 0,
          createdAt: new Date("2026-03-06T09:00:00.000Z"),
          author: {
            id: "user-image-filter",
            name: "sam",
            nickname: "샘",
            image: null,
          },
          neighborhood: null,
          petType: null,
          images: [
            { id: "image-ok", url: "/media/uploads/renderable.webp" },
            { id: "image-missing", url: "/media/uploads/missing.jpg" },
          ],
          reactions: [],
        },
      ],
      nextCursor: null,
    } as never);

    const response = await GET(new Request("http://localhost/api/feed/guest") as NextRequest);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockResolveRenderableUploadPathnames).toHaveBeenCalledWith([
      "/media/uploads/renderable.webp",
      "/media/uploads/missing.jpg",
    ]);
    expect(payload.data.feed.items[0].images).toEqual([
      { id: "image-ok", url: "/media/uploads/renderable.webp" },
    ]);
  });

  it("treats an all-petType query as no filter for period feed requests", async () => {
    mockListPosts.mockResolvedValue({
      items: [],
      nextCursor: null,
    } as never);

    const response = await GET(
      new Request(
        "http://localhost/api/feed/guest?petType=c000000000000000000000201&petType=c000000000000000000000202&period=7",
      ) as NextRequest,
    );

    expect(response.status).toBe(200);
    expect(mockCountPosts).not.toHaveBeenCalled();
    expect(mockListPosts).toHaveBeenCalledWith(
      expect.objectContaining({
        petTypeId: undefined,
        petTypeIds: [],
        sort: "LATEST",
      }),
    );
  });

  it("keeps exact count for non-first page requests", async () => {
    mockCountPosts.mockResolvedValue(25);
    mockListPosts.mockResolvedValue({
      items: [],
      nextCursor: null,
    } as never);

    const response = await GET(
      new Request("http://localhost/api/feed/guest?page=2") as NextRequest,
    );

    expect(response.status).toBe(200);
    expect(mockCountPosts).toHaveBeenCalledOnce();
    expect(mockListPosts).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
      }),
    );
  });

  it("returns 500 on unexpected errors", async () => {
    mockListCommunityNavItems.mockRejectedValue(new Error("boom"));

    const response = await GET(
      new Request("http://localhost/api/feed/guest") as NextRequest,
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.ok).toBe(false);
    expect(mockMonitorUnhandledError).toHaveBeenCalledTimes(1);
  });

  it("surfaces schema sync errors from guest read policy", async () => {
    mockGetGuestReadLoginRequiredPostTypes.mockRejectedValue(
      new ServiceError("schema sync required", "SCHEMA_SYNC_REQUIRED", 503),
    );

    const response = await GET(
      new Request("http://localhost/api/feed/guest") as NextRequest,
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toEqual({
      ok: false,
      error: {
        code: "SCHEMA_SYNC_REQUIRED",
        message: "schema sync required",
      },
    });
  });
});
