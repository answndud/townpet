import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/metrics/web-vitals/route";
import { monitorUnhandledError } from "@/server/error-monitor";
import { enforceRateLimit } from "@/server/rate-limit";
import { ServiceError } from "@/server/services/service-error";
import { recordWebVitalSample } from "@/server/services/web-vitals.service";

vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn(() => "127.0.0.1") }));
vi.mock("@/server/services/web-vitals.service", () => ({
  recordWebVitalSample: vi.fn(),
}));

const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockRecordWebVitalSample = vi.mocked(recordWebVitalSample);

function createRequest(body: unknown) {
  return new Request("http://localhost/api/metrics/web-vitals", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as NextRequest;
}

describe("POST /api/metrics/web-vitals contract", () => {
  beforeEach(() => {
    mockMonitorUnhandledError.mockReset();
    mockEnforceRateLimit.mockReset();
    mockRecordWebVitalSample.mockReset();
  });

  it("records route-normalized web vital samples without authentication", async () => {
    mockEnforceRateLimit.mockResolvedValue();
    mockRecordWebVitalSample.mockResolvedValue({ ok: true, recorded: true });

    const response = await POST(
      createRequest({
        metric: "LCP",
        value: 680,
        rating: "GOOD",
        route: "/posts/cmp123/guest",
        navigationType: "navigate",
        deviceType: "mobile",
        connectionType: "4g",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      data: { recorded: true, skippedReason: null },
    });
    expect(mockEnforceRateLimit).toHaveBeenCalledWith({
      key: "web-vitals:ip:127.0.0.1",
      limit: 240,
      windowMs: 60_000,
      cacheMs: 500,
      failureMode: "closed",
    });
    expect(mockRecordWebVitalSample).toHaveBeenCalledWith({
      metric: "LCP",
      value: 680,
      rating: "GOOD",
      route: "/posts/[id]/guest",
      navigationType: "navigate",
      deviceType: "mobile",
      connectionType: "4g",
    });
  });

  it("returns 202 when metric storage is not ready", async () => {
    mockEnforceRateLimit.mockResolvedValue();
    mockRecordWebVitalSample.mockResolvedValue({
      ok: false,
      reason: "SCHEMA_SYNC_REQUIRED",
    });

    const response = await POST(
      createRequest({
        metric: "TTFB",
        value: 105,
        rating: "GOOD",
        route: "/feed/guest",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(payload).toMatchObject({
      ok: true,
      data: { recorded: false, skippedReason: "SCHEMA_SYNC_REQUIRED" },
    });
  });

  it("returns 400 for invalid payloads", async () => {
    mockEnforceRateLimit.mockResolvedValue();

    const response = await POST(createRequest({ metric: "BAD", value: -1, route: "x" }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INVALID_INPUT" },
    });
    expect(mockRecordWebVitalSample).not.toHaveBeenCalled();
  });

  it("returns rate limit errors as normalized service errors", async () => {
    mockEnforceRateLimit.mockRejectedValue(
      new ServiceError("요청이 너무 많습니다.", "RATE_LIMITED", 429),
    );

    const response = await POST(
      createRequest({
        metric: "FCP",
        value: 500,
        rating: "GOOD",
        route: "/",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "RATE_LIMITED" },
    });
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockEnforceRateLimit.mockResolvedValue();
    mockRecordWebVitalSample.mockRejectedValue(new Error("db down"));

    const response = await POST(
      createRequest({
        metric: "CLS",
        value: 0,
        rating: "GOOD",
        route: "/login",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_SERVER_ERROR" },
    });
    expect(mockMonitorUnhandledError).toHaveBeenCalledOnce();
  });
});
