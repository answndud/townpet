import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/users/[id]/profile-summary/route";
import { requireCurrentUserId } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getUserRelationState } from "@/server/queries/user-relation.queries";
import { getPublicUserProfileById } from "@/server/queries/user.queries";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/auth", () => ({
  requireCurrentUserId: vi.fn(),
}));

vi.mock("@/server/error-monitor", () => ({
  monitorUnhandledError: vi.fn(),
}));

vi.mock("@/server/queries/user-relation.queries", () => ({
  getUserRelationState: vi.fn(),
}));

vi.mock("@/server/queries/user.queries", () => ({
  getPublicUserProfileById: vi.fn(),
}));

const mockRequireCurrentUserId = vi.mocked(requireCurrentUserId);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetUserRelationState = vi.mocked(getUserRelationState);
const mockGetPublicUserProfileById = vi.mocked(getPublicUserProfileById);

describe("GET /api/users/[id]/profile-summary", () => {
  beforeEach(() => {
    mockRequireCurrentUserId.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockGetUserRelationState.mockReset();
    mockGetUserRelationState.mockResolvedValue({
      isBlockedByMe: false,
      hasBlockedMe: false,
      isMutedByMe: false,
    });
    mockGetPublicUserProfileById.mockReset();
  });

  it("returns a no-store public profile summary for authenticated viewers", async () => {
    mockRequireCurrentUserId.mockResolvedValue("viewer-1");
    mockGetPublicUserProfileById.mockResolvedValue({
      id: "user-1",
      nickname: "타운펫",
      bio: null,
      image: null,
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
      showPublicPosts: true,
      showPublicComments: false,
      showPublicPets: true,
      postCount: 12,
      commentCount: null,
      reactionCount: 31,
    } as never);

    const response = await GET(
      new Request("http://localhost/api/users/user-1/profile-summary") as NextRequest,
      { params: Promise.resolve({ id: "user-1" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(payload).toEqual({
      ok: true,
      data: {
        id: "user-1",
        showPublicPosts: true,
        showPublicComments: false,
        postCount: 12,
        commentCount: null,
        reactionCount: 31,
      },
    });
  });

  it("returns auth errors consistently", async () => {
    mockRequireCurrentUserId.mockRejectedValue(
      new ServiceError("로그인이 필요합니다.", "AUTH_REQUIRED", 401),
    );

    const response = await GET(
      new Request("http://localhost/api/users/user-1/profile-summary") as NextRequest,
      { params: Promise.resolve({ id: "user-1" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({
      ok: false,
      error: {
        code: "AUTH_REQUIRED",
        message: "로그인이 필요합니다.",
      },
    });
  });

  it("returns sanction errors consistently", async () => {
    mockRequireCurrentUserId.mockRejectedValue(
      new ServiceError("제재된 계정입니다.", "ACCOUNT_SUSPENDED", 403),
    );

    const response = await GET(
      new Request("http://localhost/api/users/user-1/profile-summary") as NextRequest,
      { params: Promise.resolve({ id: "user-1" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toEqual({
      ok: false,
      error: {
        code: "ACCOUNT_SUSPENDED",
        message: "제재된 계정입니다.",
      },
    });
    expect(mockGetPublicUserProfileById).not.toHaveBeenCalled();
  });

  it("returns 404 when the viewer has a block relation with the target", async () => {
    mockRequireCurrentUserId.mockResolvedValue("viewer-1");
    mockGetUserRelationState.mockResolvedValue({
      isBlockedByMe: true,
      hasBlockedMe: false,
      isMutedByMe: false,
    });

    const response = await GET(
      new Request("http://localhost/api/users/user-1/profile-summary") as NextRequest,
      { params: Promise.resolve({ id: "user-1" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "사용자를 찾을 수 없습니다.",
      },
    });
    expect(mockGetPublicUserProfileById).not.toHaveBeenCalled();
  });

  it("returns 500 for unexpected failures", async () => {
    mockRequireCurrentUserId.mockResolvedValue("viewer-1");
    mockGetPublicUserProfileById.mockRejectedValue(new Error("boom"));

    const response = await GET(
      new Request("http://localhost/api/users/user-1/profile-summary") as NextRequest,
      { params: Promise.resolve({ id: "user-1" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({
      ok: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "서버 오류가 발생했습니다.",
      },
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledTimes(1);
  });
});
