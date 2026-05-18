import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/auth/password/setup/route";
import { requireCurrentUser } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { setPasswordForUser } from "@/server/services/auth.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/auth", () => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("@/server/services/auth.service", () => ({
  setPasswordForUser: vi.fn(),
}));

const mockRequireCurrentUser = vi.mocked(requireCurrentUser);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetClientIp = vi.mocked(getClientIp);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockSetPasswordForUser = vi.mocked(setPasswordForUser);

describe("POST /api/auth/password/setup contract", () => {
  beforeEach(() => {
    mockRequireCurrentUser.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();
    mockSetPasswordForUser.mockReset();

    mockRequireCurrentUser.mockResolvedValue({ id: "user-1" } as never);
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockEnforceRateLimit.mockResolvedValue();
    mockSetPasswordForUser.mockResolvedValue(undefined);
  });

  it("requires an authenticated user", async () => {
    mockRequireCurrentUser.mockRejectedValue(
      new ServiceError("login required", "AUTH_REQUIRED", 401),
    );
    const request = new Request("http://localhost/api/auth/password/setup", {
      method: "POST",
      body: JSON.stringify({ password: "Townpet!2026" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "AUTH_REQUIRED" },
    });
    expect(mockEnforceRateLimit).not.toHaveBeenCalled();
  });

  it("returns INVALID_INPUT for weak passwords", async () => {
    const request = new Request("http://localhost/api/auth/password/setup", {
      method: "POST",
      body: JSON.stringify({ password: "weak" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INVALID_INPUT" },
    });
    expect(mockSetPasswordForUser).not.toHaveBeenCalled();
  });

  it("rate limits by user id and forwards password setup metadata", async () => {
    const request = new Request("http://localhost/api/auth/password/setup", {
      method: "POST",
      body: JSON.stringify({
        currentPassword: "Oldpass!2026",
        password: "Townpet!2026",
      }),
      headers: {
        "content-type": "application/json",
        "user-agent": "Vitest",
      },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ ok: true, data: { ok: true } });
    expect(mockEnforceRateLimit).toHaveBeenCalledWith({
      key: "auth:password:setup:user-1",
      limit: 5,
      windowMs: 60_000,
    });
    expect(mockSetPasswordForUser).toHaveBeenCalledWith({
      userId: "user-1",
      input: {
        currentPassword: "Oldpass!2026",
        password: "Townpet!2026",
      },
      meta: {
        ipAddress: "127.0.0.1",
        userAgent: "Vitest",
      },
    });
  });

  it("maps password setup service errors", async () => {
    mockSetPasswordForUser.mockRejectedValue(
      new ServiceError("wrong", "CURRENT_PASSWORD_INVALID", 400),
    );
    const request = new Request("http://localhost/api/auth/password/setup", {
      method: "POST",
      body: JSON.stringify({
        currentPassword: "Oldpass!2026",
        password: "Townpet!2026",
      }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "CURRENT_PASSWORD_INVALID" },
    });
    expect(mockMonitorUnhandledError).not.toHaveBeenCalled();
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockEnforceRateLimit.mockRejectedValue(new Error("ratelimit backend down"));
    const request = new Request("http://localhost/api/auth/password/setup", {
      method: "POST",
      body: JSON.stringify({ password: "Townpet!2026" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledOnce();
  });
});
