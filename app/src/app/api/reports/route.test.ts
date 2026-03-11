import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/reports/route";
import { requireCurrentUser } from "@/server/auth";
import { enforceAuthenticatedWriteRateLimit } from "@/server/authenticated-write-throttle";
import { monitorUnhandledError } from "@/server/error-monitor";
import { createReport } from "@/server/services/report.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/auth", () => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/server/authenticated-write-throttle", () => ({
  enforceAuthenticatedWriteRateLimit: vi.fn(),
}));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/services/report.service", () => ({ createReport: vi.fn() }));

const mockRequireCurrentUser = vi.mocked(requireCurrentUser);
const mockEnforceAuthenticatedWriteRateLimit = vi.mocked(enforceAuthenticatedWriteRateLimit);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockCreateReport = vi.mocked(createReport);

describe("POST /api/reports contract", () => {
  beforeEach(() => {
    mockRequireCurrentUser.mockReset();
    mockEnforceAuthenticatedWriteRateLimit.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockCreateReport.mockReset();
    mockEnforceAuthenticatedWriteRateLimit.mockResolvedValue(undefined);
  });

  it("maps auth service error to 401", async () => {
    mockRequireCurrentUser.mockRejectedValue(
      new ServiceError("login", "AUTH_REQUIRED", 401),
    );
    const request = new Request("http://localhost/api/reports", {
      method: "POST",
      body: JSON.stringify({ targetType: "POST", targetId: "p1", reason: "SPAM" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "AUTH_REQUIRED" },
    });
  });

  it("maps duplicate report error to 409", async () => {
    mockRequireCurrentUser.mockResolvedValue({ id: "user-1" } as never);
    mockCreateReport.mockRejectedValue(
      new ServiceError("dup", "DUPLICATE_REPORT", 409),
    );
    const request = new Request("http://localhost/api/reports", {
      method: "POST",
      body: JSON.stringify({ targetType: "POST", targetId: "p1", reason: "SPAM" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "DUPLICATE_REPORT" },
    });
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockRequireCurrentUser.mockResolvedValue({ id: "user-1" } as never);
    mockEnforceAuthenticatedWriteRateLimit.mockRejectedValue(new Error("redis down"));
    const request = new Request("http://localhost/api/reports", {
      method: "POST",
      body: JSON.stringify({ targetType: "POST", targetId: "p1", reason: "SPAM" }),
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

  it("passes authenticated client fingerprint into report throttling", async () => {
    mockRequireCurrentUser.mockResolvedValue({ id: "user-1" } as never);
    mockCreateReport.mockResolvedValue({ id: "report-1" } as never);
    const request = new Request("http://localhost/api/reports", {
      method: "POST",
      body: JSON.stringify({ targetType: "POST", targetId: "p1", reason: "SPAM" }),
      headers: {
        "content-type": "application/json",
        "x-client-fingerprint": "device-fp-1",
      },
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockEnforceAuthenticatedWriteRateLimit).toHaveBeenCalledWith({
      scope: "report:create",
      userId: "user-1",
      ip: expect.any(String),
      clientFingerprint: "device-fp-1",
    });
  });
});
