import { PostScope, PostStatus, PostType } from "@prisma/client";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/home/feed/route";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { listBestPosts, listPosts } from "@/server/queries/post.queries";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";

vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/policy.queries", () => ({
  getGuestReadLoginRequiredPostTypes: vi.fn(),
}));
vi.mock("@/server/queries/post.queries", () => ({
  listBestPosts: vi.fn(),
  listPosts: vi.fn(),
}));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));

const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetGuestReadLoginRequiredPostTypes = vi.mocked(getGuestReadLoginRequiredPostTypes);
const mockListBestPosts = vi.mocked(listBestPosts);
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
    mockListBestPosts.mockReset();
    mockListPosts.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();

    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockEnforceRateLimit.mockResolvedValue();
    mockGetGuestReadLoginRequiredPostTypes.mockResolvedValue([PostType.MEETUP]);
    mockListBestPosts.mockResolvedValue([createPost()] as never);
    mockListPosts.mockResolvedValue({
      items: [createPost({ id: "post-2", title: "산책코스 추천" })],
      nextCursor: null,
    } as never);
  });

  it("returns compact best and latest home feed with public cache headers", async () => {
    const response = await GET(new Request("http://localhost/api/home/feed") as NextRequest);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, s-maxage=60, stale-while-revalidate=300");
    expect(mockEnforceRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ key: "home-feed:ip:127.0.0.1", limit: 60 }),
    );
    expect(mockListBestPosts).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: PostScope.GLOBAL,
        excludeTypes: [PostType.MEETUP],
        limit: 5,
      }),
    );
    expect(mockListPosts).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: PostScope.GLOBAL,
        excludeTypes: [PostType.MEETUP],
        sort: "LATEST",
        limit: 5,
      }),
    );
    expect(payload.ok).toBe(true);
    expect(payload.data.best[0]).toMatchObject({
      href: "/posts/post-1",
      title: "서초구 24시 병원 후기",
      excerpt: "야간 진료 설명이 자세했습니다.",
      typeLabel: "병원 후기",
      neighborhoodLabel: "서초구 잠원동",
    });
    expect(payload.data.latest[0]).toMatchObject({
      href: "/posts/post-2",
      title: "산책코스 추천",
    });
  });

  it("returns 500 and monitors unexpected failures", async () => {
    mockListBestPosts.mockRejectedValue(new Error("boom"));

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
