import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/notifications/redirect/[id]/route";
import { requireCurrentUserId } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getNotificationNavigationTarget } from "@/server/queries/notification.queries";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/auth", () => ({ requireCurrentUserId: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/notification.queries", () => ({
  getNotificationNavigationTarget: vi.fn(),
}));

const mockRequireCurrentUserId = vi.mocked(requireCurrentUserId);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetNotificationNavigationTarget = vi.mocked(getNotificationNavigationTarget);

describe("GET /notifications/redirect/[id]", () => {
  beforeEach(() => {
    mockRequireCurrentUserId.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockGetNotificationNavigationTarget.mockReset();

    mockRequireCurrentUserId.mockResolvedValue("user-1");
    mockGetNotificationNavigationTarget.mockResolvedValue({
      href: "/posts/post-1#comment-comment-1",
      archived: false,
      found: true,
    });
  });

  it("redirects to the resolved notification target", async () => {
    const response = await GET(
      new Request("http://localhost/notifications/redirect/noti-1") as NextRequest,
      { params: Promise.resolve({ id: "noti-1" }) },
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/posts/post-1#comment-comment-1",
    );
  });

  it("falls back to notifications when the target is unavailable", async () => {
    mockGetNotificationNavigationTarget.mockResolvedValue({
      href: "/notifications?notice=TARGET_UNAVAILABLE",
      archived: true,
      found: true,
    });

    const response = await GET(
      new Request("http://localhost/notifications/redirect/noti-2") as NextRequest,
      { params: Promise.resolve({ id: "noti-2" }) },
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost/notifications?notice=TARGET_UNAVAILABLE",
    );
  });

  it("redirects unauthenticated access to login", async () => {
    mockRequireCurrentUserId.mockRejectedValue(
      new ServiceError("로그인이 필요합니다.", "AUTH_REQUIRED", 401),
    );

    const response = await GET(
      new Request("http://localhost/notifications/redirect/noti-3") as NextRequest,
      { params: Promise.resolve({ id: "noti-3" }) },
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost/login?next=%2Fnotifications",
    );
  });
});
