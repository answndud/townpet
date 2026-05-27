import { PostScope, PostStatus, PostType } from "@prisma/client";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/home/feed/route";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { listPosts } from "@/server/queries/post.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";

vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/policy.queries", () => ({
  getGuestReadLoginRequiredPostTypes: vi.fn(),
}));
vi.mock("@/server/queries/post.queries", () => ({
  listPosts: vi.fn(),
}));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));

const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetGuestReadLoginRequiredPostTypes = vi.mocked(getGuestReadLoginRequiredPostTypes);
const mockListPosts = vi.mocked(listPosts);
const mockGetClientIp = vi.mocked(getClientIp);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

function createPost(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "post-1",
    type: PostType.HOSPITAL_REVIEW,
    scope: PostScope.GLOBAL,
    status: PostStatus.ACTIVE,
    title: "서초구 24시 병원 후기",
    content: "<p>야간 진료 설명이 자세했습니다.</p>",
    commentCount: 3,
    likeCount: 7,
    dislikeCount: 0,
    viewCount: 42,
    createdAt: new Date("2026-05-21T01:00:00.000Z"),
    author: {
      id: "user-1",
      nickname: "알렉스",
      image: null,
    },
    guestAuthorId: null,
    guestDisplayName: null,
    neighborhood: {
      id: "neighborhood-1",
      name: "잠원동",
      city: "서울",
      district: "서초구",
    },
    petType: null,
    images: [],
    reactions: [],
    ...overrides,
  };
}

describe("GET /api/home/feed", () => {
  beforeEach(() => {
    mockMonitorUnhandledError.mockReset();
    mockGetGuestReadLoginRequiredPostTypes.mockReset();
    mockListPosts.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();

    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockEnforceRateLimit.mockResolvedValue();
    mockGetGuestReadLoginRequiredPostTypes.mockResolvedValue([PostType.MEETUP]);
    mockListPosts.mockResolvedValue({
      items: [createPost()],
      nextCursor: null,
    } as never);
  });

  it("returns compact featured and latest home feed", async () => {
    const response = await GET(new Request("http://localhost/api/home/feed") as NextRequest);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, s-maxage=60, stale-while-revalidate=300");
    expect(mockEnforceRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ key: "home-feed:ip:127.0.0.1", limit: 60 }),
    );
    expect(mockListPosts).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: PostScope.GLOBAL,
        excludeTypes: [PostType.MEETUP],
        sort: "LATEST",
        limit: 15,
      }),
    );
    expect(payload.ok).toBe(true);
    expect(payload.data.featured[0]).toMatchObject({
      href: "/posts/post-1",
      title: "서초구 24시 병원 후기",
      excerpt: "야간 진료 설명이 자세했습니다.",
      typeLabel: "병원 후기",
      neighborhoodLabel: "서초구 잠원동",
    });
    expect(payload.data.best).toBeUndefined();
    expect(payload.data.latest).toEqual([]);
  });

  it("excludes e2e and test-like posts from the public home preview", async () => {
    mockListPosts.mockResolvedValue({
      items: [
        createPost({ id: "post-visible", title: "우리 동네 산책 후기" }),
        createPost({
          id: "post-e2e",
          title: "[PW SEARCH] 입양 공개 adoption-123",
          author: { nickname: "e2e-search-visible" },
        }),
        createPost({
          id: "post-test",
          title: "이미지 업로드 테스트",
          content: "평범한 본문",
        }),
        createPost({
          id: "post-playwright",
          title: "평범한 제목",
          content: "playwright generated body",
        }),
        createPost({
          id: "post-pw",
          title: "[PW] 비회원 글 1778732358441-cmde1f",
          author: { nickname: "비회원E2E" },
        }),
        createPost({
          id: "post-visual",
          title: "[VISUAL SMOKE] VISUAL1778720010517",
          author: { nickname: "visual-smoke" },
        }),
        createPost({ id: "post-latest", title: "동네 병원 후기" }),
      ],
      nextCursor: null,
    } as never);

    const response = await GET(new Request("http://localhost/api/home/feed") as NextRequest);
    const payload = await response.json();

    expect(payload.ok).toBe(true);
    expect(payload.data.featured.map((post: { id: string }) => post.id)).toEqual([
      "post-visible",
      "post-latest",
    ]);
    expect(payload.data.latest).toEqual([]);
  });

  it("prioritizes verified operator content before engagement-only posts", async () => {
    mockListPosts.mockResolvedValue({
      items: [
        createPost({
          id: "post-popular",
          title: "댓글이 많은 사용자 글",
          commentCount: 20,
          likeCount: 50,
          viewCount: 1_000,
          createdAt: new Date("2026-05-25T01:00:00.000Z"),
        }),
        createPost({
          id: "post-operator-verified",
          title: "야간 산책 전 확인할 것",
          isOperatorContent: true,
          operatorSourceName: "TownPet 운영자 정리",
          operatorLastVerifiedAt: new Date("2026-05-24T01:00:00.000Z"),
          commentCount: 0,
          likeCount: 0,
          viewCount: 0,
          createdAt: new Date("2026-05-23T01:00:00.000Z"),
        }),
      ],
      nextCursor: null,
    } as never);

    const response = await GET(new Request("http://localhost/api/home/feed") as NextRequest);
    const payload = await response.json();

    expect(payload.ok).toBe(true);
    expect(payload.data.featured.map((post: { id: string }) => post.id)).toEqual([
      "post-operator-verified",
      "post-popular",
    ]);
    expect(payload.data.featured[0]).toMatchObject({
      isOperatorContent: true,
      operatorSourceName: "TownPet 운영자 정리",
      operatorLastVerifiedAt: "2026-05-24T01:00:00.000Z",
    });
    expect(payload.data.best).toBeUndefined();
  });

  it("excludes production demo sample posts and fills featured from a wider preview candidate pool", async () => {
    mockListPosts.mockResolvedValue({
      items: [
        createPost({
          id: "post-demo-author",
          title: "첫 목욕 끝내고 포근해진 코코 자랑합니다",
          author: { nickname: "townpet-demo" },
        }),
        createPost({
          id: "post-sample-title",
          title: "[샘플 안내] 실종/목격 게시판은 실제 제보만 등록해 주세요",
          author: { nickname: "운영 안내" },
        }),
        createPost({ id: "post-real-1", title: "동네 병원 후기 1" }),
        createPost({ id: "post-real-2", title: "동네 병원 후기 2" }),
        createPost({ id: "post-real-3", title: "동네 병원 후기 3" }),
        createPost({ id: "post-real-4", title: "동네 병원 후기 4" }),
        createPost({ id: "post-real-5", title: "동네 병원 후기 5" }),
        createPost({ id: "post-real-6", title: "동네 병원 후기 6" }),
      ],
      nextCursor: null,
    } as never);

    const response = await GET(new Request("http://localhost/api/home/feed") as NextRequest);
    const payload = await response.json();

    expect(payload.ok).toBe(true);
    expect(payload.data.featured.map((post: { id: string }) => post.id)).toEqual([
      "post-real-1",
      "post-real-2",
      "post-real-3",
      "post-real-4",
      "post-real-5",
    ]);
    expect(payload.data.latest.map((post: { id: string }) => post.id)).toEqual([
      "post-real-6",
    ]);
  });

  it("returns 500 and monitors unexpected failures", async () => {
    mockListPosts.mockRejectedValue(new Error("boom"));

    const response = await GET(new Request("http://localhost/api/home/feed") as NextRequest);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledOnce();
  });
});
