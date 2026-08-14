import { UserRole } from "@prisma/client";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/viewer-shell/route";
import { auth } from "@/lib/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { countUnreadNotifications } from "@/server/queries/notification.queries";
import { getUserById } from "@/server/queries/user.queries";
import { ServiceError } from "@/server/services/service-error";
import { prepareNotificationList } from "@/server/services/notifications/notification.service";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/queries/notification.queries", () => ({
  countUnreadNotifications: vi.fn(),
}));
vi.mock("@/server/queries/user.queries", () => ({
  getUserById: vi.fn(),
}));
vi.mock("@/server/services/notifications/notification.service", () => ({
  prepareNotificationList: vi.fn(),
}));

const mockAuth = vi.mocked(auth);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockCountUnreadNotifications = vi.mocked(countUnreadNotifications);
const mockGetUserById = vi.mocked(getUserById);
const mockPrepareNotificationList = vi.mocked(prepareNotificationList);

describe("GET /api/viewer-shell contract", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockCountUnreadNotifications.mockReset();
    mockGetUserById.mockReset();
    mockPrepareNotificationList.mockReset();
  });

  it("returns guest shell when session is absent", async () => {
    mockAuth.mockResolvedValue(null as never);

    const response = await GET(new Request("http://localhost/api/viewer-shell") as NextRequest);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: {
        isAuthenticated: false,
        userId: null,
        canModerate: false,
        unreadNotificationCount: 0,
      },
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns authenticated shell metadata", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } } as never);
    mockGetUserById.mockResolvedValue({
      id: "user-1",
      role: UserRole.MODERATOR,
    } as never);
    mockCountUnreadNotifications.mockResolvedValue(4);

    const response = await GET(new Request("http://localhost/api/viewer-shell") as NextRequest);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockPrepareNotificationList).toHaveBeenCalledWith("user-1");
    expect(payload).toEqual({
      ok: true,
      data: {
        isAuthenticated: true,
        userId: "user-1",
        canModerate: true,
        unreadNotificationCount: 4,
      },
    });
  });

  it("falls back to guest shell when auth lookup fails", async () => {
    mockAuth.mockRejectedValue(new Error("boom"));

    const response = await GET(new Request("http://localhost/api/viewer-shell") as NextRequest);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: {
        isAuthenticated: false,
        userId: null,
        canModerate: false,
        unreadNotificationCount: 0,
      },
    });
    expect(mockMonitorUnhandledError).not.toHaveBeenCalled();
  });

  it("falls back to zero unread notifications when notification schema sync is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } } as never);
    mockGetUserById.mockResolvedValue({
      id: "user-1",
      role: UserRole.USER,
    } as never);
    mockCountUnreadNotifications.mockRejectedValue(
      new ServiceError("schema sync required", "SCHEMA_SYNC_REQUIRED", 503),
    );

    const response = await GET(new Request("http://localhost/api/viewer-shell") as NextRequest);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: {
        isAuthenticated: true,
        userId: "user-1",
        canModerate: false,
        unreadNotificationCount: 0,
      },
    });
  });
});
