import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/auth/password/reset/confirm/route";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { confirmPasswordReset } from "@/server/services/auth.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("@/server/services/auth.service", () => ({
  confirmPasswordReset: vi.fn(),
}));

const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetClientIp = vi.mocked(getClientIp);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockConfirmPasswordReset = vi.mocked(confirmPasswordReset);

describe("POST /api/auth/password/reset/confirm contract", () => {
  beforeEach(() => {
    mockMonitorUnhandledError.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();
    mockConfirmPasswordReset.mockReset();

    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockEnforceRateLimit.mockResolvedValue();
    mockConfirmPasswordReset.mockResolvedValue(undefined);
  });

  it("returns INVALID_INPUT for malformed payload", async () => {
    const request = new Request("http://localhost/api/auth/password/reset/confirm", {
      method: "POST",
      body: JSON.stringify({ token: "short", password: "weak" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INVALID_INPUT" },
    });
    expect(mockConfirmPasswordReset).not.toHaveBeenCalled();
  });

  it("rate limits by client ip and forwards reset metadata", async () => {
    const request = new Request("http://localhost/api/auth/password/reset/confirm", {
      method: "POST",
      body: JSON.stringify({
        token: "reset-token-reset-token-reset-token-1",
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
      key: "auth:password:confirm:127.0.0.1",
      limit: 5,
      windowMs: 60_000,
    });
    expect(mockConfirmPasswordReset).toHaveBeenCalledWith({
      input: {
        token: "reset-token-reset-token-reset-token-1",
        password: "Townpet!2026",
      },
      meta: {
        ipAddress: "127.0.0.1",
        userAgent: "Vitest",
      },
    });
  });

  it("maps reset service errors", async () => {
    mockConfirmPasswordReset.mockRejectedValue(
      new ServiceError("expired", "PASSWORD_RESET_TOKEN_INVALID", 400),
    );
    const request = new Request("http://localhost/api/auth/password/reset/confirm", {
      method: "POST",
      body: JSON.stringify({
        token: "reset-token-reset-token-reset-token-1",
        password: "Townpet!2026",
      }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "PASSWORD_RESET_TOKEN_INVALID" },
    });
    expect(mockMonitorUnhandledError).not.toHaveBeenCalled();
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockEnforceRateLimit.mockRejectedValue(new Error("ratelimit backend down"));
    const request = new Request("http://localhost/api/auth/password/reset/confirm", {
      method: "POST",
      body: JSON.stringify({
        token: "reset-token-reset-token-reset-token-1",
        password: "Townpet!2026",
      }),
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
