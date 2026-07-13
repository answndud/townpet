import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/posts/[id]/reaction/route";
import { getCurrentUserIdFromRequest } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { findViewerPostReaction } from "@/server/queries/post.queries";

vi.mock("@/server/auth", () => ({ getCurrentUserIdFromRequest: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/post.queries", () => ({ findViewerPostReaction: vi.fn() }));

const mockGetCurrentUserIdFromRequest = vi.mocked(getCurrentUserIdFromRequest);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockFindViewerPostReaction = vi.mocked(findViewerPostReaction);

describe("GET /api/posts/[id]/reaction contract", () => {
  beforeEach(() => {
    mockGetCurrentUserIdFromRequest.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockFindViewerPostReaction.mockReset();
    mockGetCurrentUserIdFromRequest.mockResolvedValue(null);
    mockFindViewerPostReaction.mockResolvedValue(null);
  });

  it("returns AUTH_REQUIRED when user is not authenticated", async () => {
    const request = new Request("http://localhost/api/posts/post-1/reaction") as NextRequest;

    const response = await GET(request, { params: Promise.resolve({ id: "post-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "AUTH_REQUIRED" },
    });
  });

  it("returns current reaction type for authenticated user", async () => {
    mockGetCurrentUserIdFromRequest.mockResolvedValue("user-1");
    mockFindViewerPostReaction.mockResolvedValue("LIKE");
    const request = new Request("http://localhost/api/posts/post-1/reaction") as NextRequest;

    const response = await GET(request, { params: Promise.resolve({ id: "post-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      data: { reaction: "LIKE" },
    });
    expect(mockFindViewerPostReaction).toHaveBeenCalledWith({ postId: "post-1", userId: "user-1" });
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockGetCurrentUserIdFromRequest.mockResolvedValue("user-1");
    mockFindViewerPostReaction.mockRejectedValue(new Error("db down"));
    const request = new Request("http://localhost/api/posts/post-1/reaction") as NextRequest;

    const response = await GET(request, { params: Promise.resolve({ id: "post-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledOnce();
  });
});
