import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/posts/[id]/content/route";
import { buildPostDetailMediaRendering } from "@/lib/post-detail-rendering";
import { getCurrentUserIdFromRequest } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getPostContentById } from "@/server/queries/post.queries";
import { assertPostReadable } from "@/server/services/post-read-access.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/lib/post-detail-rendering", () => ({ buildPostDetailMediaRendering: vi.fn() }));
vi.mock("@/server/auth", () => ({ getCurrentUserIdFromRequest: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/post.queries", () => ({ getPostContentById: vi.fn() }));
vi.mock("@/server/services/post-read-access.service", () => ({
  assertPostReadable: vi.fn(),
}));

const mockBuildPostDetailMediaRendering = vi.mocked(buildPostDetailMediaRendering);
const mockGetCurrentUserIdFromRequest = vi.mocked(getCurrentUserIdFromRequest);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetPostContentById = vi.mocked(getPostContentById);
const mockAssertPostReadable = vi.mocked(assertPostReadable);

describe("GET /api/posts/[id]/content contract", () => {
  beforeEach(() => {
    mockBuildPostDetailMediaRendering.mockReset();
    mockGetCurrentUserIdFromRequest.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockGetPostContentById.mockReset();
    mockAssertPostReadable.mockReset();

    mockBuildPostDetailMediaRendering.mockResolvedValue({
      renderedContentHtml: "<p>본문 <strong>강조</strong></p>",
      renderedContentText: "본문 강조",
      renderableImages: [],
      hasInlineImages: false,
    });
    mockGetCurrentUserIdFromRequest.mockResolvedValue("user-1");
    mockGetPostContentById.mockResolvedValue({
      id: "post-1",
      content: "본문 **강조**",
      status: "ACTIVE",
      scope: "GLOBAL",
      type: "FREE_POST",
    } as never);
    mockAssertPostReadable.mockResolvedValue(undefined);
  });

  it("returns rendered html/text with no-store cache header", async () => {
    const request = new Request("http://localhost/api/posts/post-1/content") as NextRequest;

    const response = await GET(request, {
      params: Promise.resolve({ id: "post-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(payload).toMatchObject({
      ok: true,
      data: {
        renderedContentHtml: "<p>본문 <strong>강조</strong></p>",
        renderedContentText: "본문 강조",
      },
    });
    expect(mockGetPostContentById).toHaveBeenCalledWith("post-1", "user-1");
    expect(mockAssertPostReadable).toHaveBeenCalledWith(
      expect.objectContaining({ id: "post-1" }),
      "user-1",
    );
    expect(mockBuildPostDetailMediaRendering).toHaveBeenCalledWith("본문 **강조**", []);
  });

  it("uses undefined viewer id for guest content reads", async () => {
    mockGetCurrentUserIdFromRequest.mockResolvedValue(null);
    const request = new Request("http://localhost/api/posts/post-1/content") as NextRequest;

    await GET(request, {
      params: Promise.resolve({ id: "post-1" }),
    });

    expect(mockGetPostContentById).toHaveBeenCalledWith("post-1", undefined);
    expect(mockAssertPostReadable).toHaveBeenCalledWith(
      expect.objectContaining({ id: "post-1" }),
      undefined,
    );
  });

  it("returns NOT_FOUND when content row is missing", async () => {
    mockGetPostContentById.mockResolvedValue(null);
    const request = new Request("http://localhost/api/posts/post-missing/content") as NextRequest;

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
    const request = new Request("http://localhost/api/posts/post-1/content") as NextRequest;

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
    mockGetPostContentById.mockRejectedValue(new Error("db down"));
    const request = new Request("http://localhost/api/posts/post-1/content") as NextRequest;

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
