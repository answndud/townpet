import { PostStatus, PostType } from "@prisma/client";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/posts/[id]/lost-found-share.svg/route";
import { getPostById } from "@/server/queries/post.queries";
import { assertPostReadable } from "@/server/services/post-read-access.service";

vi.mock("@/server/queries/post.queries", () => ({ getPostById: vi.fn() }));
vi.mock("@/server/services/post-read-access.service", () => ({ assertPostReadable: vi.fn() }));

const mockGetPostById = vi.mocked(getPostById);
const mockAssertPostReadable = vi.mocked(assertPostReadable);

function createRequest(postId = "post-1") {
  return new Request(`http://localhost/api/posts/${postId}/lost-found-share.svg`) as NextRequest;
}

function createParams(postId = "post-1") {
  return { params: Promise.resolve({ id: postId }) };
}

function createLostFoundPost(overrides: Record<string, unknown> = {}) {
  return {
    id: "post-1",
    type: PostType.LOST_FOUND,
    status: PostStatus.ACTIVE,
    title: "반포동에서 <고양이> 목격",
    lostFoundAlert: {
      alertType: "FOUND",
      status: "OPEN",
      petType: "고양이",
      breed: "치즈태비 & 노란 목줄",
      lastSeenAt: "2026-05-21T09:30:00.000Z",
      lastSeenLocation: "서초구 반포동 산책로 입구",
    },
    ...overrides,
  };
}

describe("GET /api/posts/[id]/lost-found-share.svg", () => {
  beforeEach(() => {
    mockGetPostById.mockReset();
    mockAssertPostReadable.mockReset();
    mockGetPostById.mockResolvedValue(createLostFoundPost() as never);
    mockAssertPostReadable.mockResolvedValue(undefined);
  });

  it("renders a public SVG poster for a readable active lost-found post", async () => {
    const response = await GET(createRequest(), createParams());
    const svg = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/svg+xml; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("public, max-age=60, stale-while-revalidate=300");
    expect(svg).toContain("<svg");
    expect(svg).toContain("TownPet");
    expect(svg).toContain("목격/보호");
    expect(svg).toContain("고양이 제보 요청");
    expect(svg).toContain("반포동에서 &lt;고양이&gt; 목격");
    expect(svg).toContain("치즈태비 &amp; 노란 목줄");
    expect(svg).toContain("townpet.vercel.app/posts/post-1/guest");
    expect(mockGetPostById).toHaveBeenCalledWith("post-1");
    expect(mockAssertPostReadable).toHaveBeenCalledWith(expect.objectContaining({ id: "post-1" }));
  });

  it("returns 404 for non lost-found posts", async () => {
    mockGetPostById.mockResolvedValue(createLostFoundPost({ type: PostType.FREE_BOARD }) as never);

    const response = await GET(createRequest(), createParams());

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
    expect(mockAssertPostReadable).not.toHaveBeenCalled();
  });

  it("returns 404 when read access policy rejects the post", async () => {
    mockAssertPostReadable.mockRejectedValue(new Error("not readable"));

    const response = await GET(createRequest(), createParams());

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
  });

  it("returns 404 for inactive posts", async () => {
    mockGetPostById.mockResolvedValue(createLostFoundPost({ status: PostStatus.HIDDEN }) as never);

    const response = await GET(createRequest(), createParams());

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
  });
});
