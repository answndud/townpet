import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/auth/verify/confirm/route";
import { sendWelcomeEmail } from "@/server/email";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getClientIp } from "@/server/request-context";
import { enforceRateLimit } from "@/server/rate-limit";
import { confirmEmailVerification } from "@/server/services/auth.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/email", () => ({ sendWelcomeEmail: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("@/server/services/auth.service", () => ({
  confirmEmailVerification: vi.fn(),
}));

const mockSendWelcomeEmail = vi.mocked(sendWelcomeEmail);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockGetClientIp = vi.mocked(getClientIp);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockConfirmEmailVerification = vi.mocked(confirmEmailVerification);

describe("POST /api/auth/verify/confirm contract", () => {
  beforeEach(() => {
    mockSendWelcomeEmail.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockGetClientIp.mockReset();
    mockEnforceRateLimit.mockReset();
    mockConfirmEmailVerification.mockReset();

    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockEnforceRateLimit.mockResolvedValue();
    mockConfirmEmailVerification.mockResolvedValue({
      email: "user@townpet.dev",
    } as never);
    mockSendWelcomeEmail.mockResolvedValue(undefined);
  });

  it("returns INVALID_INPUT for malformed payload", async () => {
    const request = new Request("http://localhost/api/auth/verify/confirm", {
      method: "POST",
      body: JSON.stringify({ token: "short" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INVALID_INPUT" },
    });
    expect(mockConfirmEmailVerification).not.toHaveBeenCalled();
  });

  it("rate limits by client ip, confirms email, and sends welcome email", async () => {
    const request = new Request("http://localhost/api/auth/verify/confirm", {
      method: "POST",
      body: JSON.stringify({ token: "verify-token-verify-token-verify-1" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ ok: true, data: { ok: true } });
    expect(mockEnforceRateLimit).toHaveBeenCalledWith({
      key: "auth:verify-confirm:127.0.0.1",
      limit: 5,
      windowMs: 60_000,
    });
    expect(mockConfirmEmailVerification).toHaveBeenCalledWith({
      input: { token: "verify-token-verify-token-verify-1" },
    });
    expect(mockSendWelcomeEmail).toHaveBeenCalledWith("user@townpet.dev");
  });

  it("maps email verification service errors", async () => {
    mockConfirmEmailVerification.mockRejectedValue(
      new ServiceError("expired", "EMAIL_VERIFICATION_TOKEN_INVALID", 400),
    );
    const request = new Request("http://localhost/api/auth/verify/confirm", {
      method: "POST",
      body: JSON.stringify({ token: "verify-token-verify-token-verify-1" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "EMAIL_VERIFICATION_TOKEN_INVALID" },
    });
    expect(mockSendWelcomeEmail).not.toHaveBeenCalled();
    expect(mockMonitorUnhandledError).not.toHaveBeenCalled();
  });

  it("returns 500 and monitors unexpected welcome email errors", async () => {
    mockSendWelcomeEmail.mockRejectedValue(new Error("mail backend down"));
    const request = new Request("http://localhost/api/auth/verify/confirm", {
      method: "POST",
      body: JSON.stringify({ token: "verify-token-verify-token-verify-1" }),
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
