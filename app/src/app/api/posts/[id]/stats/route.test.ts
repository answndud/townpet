import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/posts/[id]/stats/route";
import { getCurrentUserIdFromRequest } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getPostStatsById } from "@/server/queries/post.queries";
import { assertPostReadable } from "@/server/services/post-read-access.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/auth", () => ({ getCurrentUserIdFromRequest: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/post.queries", () => ({ getPostStatsById: vi.fn() }));
vi.mock("@/server/services/post-read-access.service", () => ({
  assertPostReadable: vi.fn(),
}));

const mockGetCurrentUserIdFromRequest = vi.mocked(getCurrentUserIdFromRequest);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetPostStatsById = vi.mocked(getPostStatsById);
const mockAssertPostReadable = vi.mocked(assertPostReadable);

describe("GET /api/posts/[id]/stats contract", () => {
  beforeEach(() => {
    mockGetCurrentUserIdFromRequest.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockGetPostStatsById.mockReset();
    mockAssertPostReadable.mockReset();

    mockGetCurrentUserIdFromRequest.mockResolvedValue("user-1");
    mockGetPostStatsById.mockResolvedValue({
      id: "post-1",
      status: "ACTIVE",
      scope: "GLOBAL",
      type: "FREE_POST",
      likeCount: 5,
      dislikeCount: 1,
      commentCount: 3,
      viewCount: 12,
    } as never);
    mockAssertPostReadable.mockResolvedValue(undefined);
  });

  it("returns engagement counters with no-store cache header", async () => {
    const request = new Request("http://localhost/api/posts/post-1/stats") as NextRequest;

    const response = await GET(request, {
      params: Promise.resolve({ id: "post-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(payload).toMatchObject({
      ok: true,
      data: {
        likeCount: 5,
        dislikeCount: 1,
        commentCount: 3,
        viewCount: 12,
      },
    });
    expect(mockGetPostStatsById).toHaveBeenCalledWith("post-1", "user-1");
    expect(mockAssertPostReadable).toHaveBeenCalledWith(
      expect.objectContaining({ id: "post-1" }),
      "user-1",
    );
  });

  it("normalizes missing counter values to zero", async () => {
    mockGetPostStatsById.mockResolvedValue({
      id: "post-1",
      status: "ACTIVE",
      scope: "GLOBAL",
      type: "FREE_POST",
      likeCount: null,
      dislikeCount: null,
      commentCount: null,
      viewCount: null,
    } as never);
    const request = new Request("http://localhost/api/posts/post-1/stats") as NextRequest;

    const response = await GET(request, {
      params: Promise.resolve({ id: "post-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toEqual({
      likeCount: 0,
      dislikeCount: 0,
      commentCount: 0,
      viewCount: 0,
    });
  });

  it("uses undefined viewer id for guest stats reads", async () => {
    mockGetCurrentUserIdFromRequest.mockResolvedValue(null);
    const request = new Request("http://localhost/api/posts/post-1/stats") as NextRequest;

    await GET(request, {
      params: Promise.resolve({ id: "post-1" }),
    });

    expect(mockGetPostStatsById).toHaveBeenCalledWith("post-1", undefined);
    expect(mockAssertPostReadable).toHaveBeenCalledWith(
      expect.objectContaining({ id: "post-1" }),
      undefined,
    );
  });

  it("returns NOT_FOUND when stats row is missing", async () => {
    mockGetPostStatsById.mockResolvedValue(null);
    const request = new Request("http://localhost/api/posts/post-missing/stats") as NextRequest;

    const response = await GET(request, {
      params: Promise.resolve({ id: "post-missing" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
    expect(mockAssertPostReadable).not.toHaveBeenCalled();
  });

  it("maps read access service errors", async () => {
    mockAssertPostReadable.mockRejectedValue(
      new ServiceError("forbidden", "FORBIDDEN", 403),
    );
    const request = new Request("http://localhost/api/posts/post-1/stats") as NextRequest;

    const response = await GET(request, {
      params: Promise.resolve({ id: "post-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    expect(mockMonitorUnhandledError).not.toHaveBeenCalled();
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockGetPostStatsById.mockRejectedValue(new Error("db down"));
    const request = new Request("http://localhost/api/posts/post-1/stats") as NextRequest;

    const response = await GET(request, {
      params: Promise.resolve({ id: "post-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledOnce();
  });
});
