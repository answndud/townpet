import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/feed/personalization/route";
import { requireAuthenticatedUserId } from "@/server/auth";
import { monitorUnhandledError } from "@/server/error-monitor";
import { enforceRateLimit } from "@/server/rate-limit";
import { recordFeedPersonalizationMetric } from "@/server/services/feed-personalization-metrics.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/auth", () => ({ requireAuthenticatedUserId: vi.fn() }));
vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn(() => "127.0.0.1") }));
vi.mock("@/server/services/feed-personalization-metrics.service", () => ({
  recordFeedPersonalizationMetric: vi.fn(),
}));

const mockRequireAuthenticatedUserId = vi.mocked(requireAuthenticatedUserId);
const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockRecordFeedPersonalizationMetric = vi.mocked(recordFeedPersonalizationMetric);

describe("POST /api/feed/personalization contract", () => {
  beforeEach(() => {
    mockRequireAuthenticatedUserId.mockReset();
    mockMonitorUnhandledError.mockReset();
    mockEnforceRateLimit.mockReset();
    mockRecordFeedPersonalizationMetric.mockReset();
  });

  it("returns 401 when authentication is required", async () => {
    mockRequireAuthenticatedUserId.mockRejectedValue(
      new ServiceError("auth", "AUTH_REQUIRED", 401),
    );

    const request = new Request("http://localhost/api/feed/personalization", {
      method: "POST",
      body: JSON.stringify({ surface: "FEED", event: "VIEW", audienceSource: "NONE" }),
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

  it("returns 202 when metric storage is not ready", async () => {
    mockRequireAuthenticatedUserId.mockResolvedValue("user-1");
    mockEnforceRateLimit.mockResolvedValue();
    mockRecordFeedPersonalizationMetric.mockResolvedValue({
      ok: false,
      reason: "SCHEMA_SYNC_REQUIRED",
    });

    const request = new Request("http://localhost/api/feed/personalization", {
      method: "POST",
      body: JSON.stringify({ surface: "FEED", event: "VIEW", audienceSource: "PET" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(payload).toMatchObject({
      ok: true,
      data: {
        recorded: false,
        skippedReason: "SCHEMA_SYNC_REQUIRED",
      },
    });
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockRequireAuthenticatedUserId.mockResolvedValue("user-1");
    mockEnforceRateLimit.mockResolvedValue();
    mockRecordFeedPersonalizationMetric.mockRejectedValue(new Error("db down"));

    const request = new Request("http://localhost/api/feed/personalization", {
      method: "POST",
      body: JSON.stringify({ surface: "FEED", event: "POST_CLICK", audienceSource: "SEGMENT" }),
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
