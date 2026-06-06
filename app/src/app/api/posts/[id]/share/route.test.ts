import { PostStatus, PostType } from "@prisma/client";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/posts/[id]/share/route";
import { getCurrentUserIdFromRequest } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { logger } from "@/server/logger";
import { getPostById } from "@/server/queries/post.queries";
import { assertPostReadable } from "@/server/services/post-read-access.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/auth", () => ({ getCurrentUserIdFromRequest: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/logger", () => ({ logger: { info: vi.fn() } }));
vi.mock("@/server/queries/post.queries", () => ({ getPostById: vi.fn() }));
vi.mock("@/server/services/post-read-access.service", () => ({ assertPostReadable: vi.fn() }));

const mockGetCurrentUserIdFromRequest = vi.mocked(getCurrentUserIdFromRequest);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockLoggerInfo = vi.mocked(logger.info);
const mockGetPostById = vi.mocked(getPostById);
const mockAssertPostReadable = vi.mocked(assertPostReadable);

function createShareRequest(body: unknown) {
  return new Request("http://localhost/api/posts/post-1/share", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as NextRequest;
}

describe("POST /api/posts/[id]/share contract", () => {
  beforeEach(() => {
    mockGetCurrentUserIdFromRequest.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockLoggerInfo.mockReset();
    mockGetPostById.mockReset();
    mockAssertPostReadable.mockReset();
    mockGetCurrentUserIdFromRequest.mockResolvedValue(null);
    mockGetPostById.mockResolvedValue({
      id: "post-1",
      type: PostType.LOST_FOUND,
      status: PostStatus.ACTIVE,
    } as never);
    mockAssertPostReadable.mockResolvedValue(undefined);
  });

  it("records a lost-found share action", async () => {
    mockGetCurrentUserIdFromRequest.mockResolvedValue("user-1");

    const response = await POST(createShareRequest({ action: "LINK_COPY" }), {
      params: Promise.resolve({ id: "post-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ ok: true, data: { recorded: true } });
    expect(mockGetPostById).toHaveBeenCalledWith("post-1", "user-1");
    expect(mockAssertPostReadable).toHaveBeenCalledWith(
      expect.objectContaining({ id: "post-1" }),
      "user-1",
    );
    expect(mockLoggerInfo).toHaveBeenCalledWith("lost-found share action", {
      postId: "post-1",
      action: "LINK_COPY",
      userId: "user-1",
    });
  });

  it("returns INVALID_SHARE_ACTION for unsupported actions", async () => {
    const response = await POST(createShareRequest({ action: "UNKNOWN" }), {
      params: Promise.resolve({ id: "post-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INVALID_SHARE_ACTION" },
    });
    expect(mockGetPostById).not.toHaveBeenCalled();
  });

  it("preserves service error responses from read-access policy", async () => {
    mockAssertPostReadable.mockRejectedValue(
      new ServiceError("대표 동네를 설정해 주세요.", "NEIGHBORHOOD_REQUIRED", 400),
    );

    const response = await POST(createShareRequest({ action: "POSTER_OPEN" }), {
      params: Promise.resolve({ id: "post-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "NEIGHBORHOOD_REQUIRED", message: "대표 동네를 설정해 주세요." },
    });
    expect(mockMonitorUnhandledError).not.toHaveBeenCalled();
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockGetPostById.mockRejectedValue(new Error("db down"));

    const response = await POST(createShareRequest({ action: "KAKAO_TEXT_COPY" }), {
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
