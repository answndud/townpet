import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/acquisition/events/route";
import { monitorUnhandledError } from "@/server/error-monitor";
import { enforceRateLimit } from "@/server/rate-limit";
import { recordAcquisitionEvent } from "@/server/services/acquisition-events.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/error-monitor", () => ({ monitorUnhandledError: vi.fn() }));
vi.mock("@/server/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("@/server/request-context", () => ({ getClientIp: vi.fn(() => "127.0.0.1") }));
vi.mock("@/server/services/acquisition-events.service", () => ({
  recordAcquisitionEvent: vi.fn(),
}));

const mockMonitorUnhandledError = vi.mocked(monitorUnhandledError);
const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockRecordAcquisitionEvent = vi.mocked(recordAcquisitionEvent);

describe("POST /api/acquisition/events contract", () => {
  beforeEach(() => {
    mockMonitorUnhandledError.mockReset();
    mockEnforceRateLimit.mockReset();
    mockRecordAcquisitionEvent.mockReset();
  });

  it("records public acquisition event aggregates without authentication", async () => {
    mockEnforceRateLimit.mockResolvedValue();
    mockRecordAcquisitionEvent.mockResolvedValue({ ok: true, recorded: true });

    const request = new Request("http://localhost/api/acquisition/events", {
      method: "POST",
      body: JSON.stringify({
        surface: "HOME",
        event: "FEED_CTA_CLICKED",
        targetType: "CTA",
        targetId: "hero_feed",
      }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      data: { recorded: true, skippedReason: null },
    });
    expect(mockRecordAcquisitionEvent).toHaveBeenCalledWith({
      surface: "HOME",
      event: "FEED_CTA_CLICKED",
      targetType: "CTA",
      targetId: "hero_feed",
    });
    expect(mockEnforceRateLimit).toHaveBeenCalledWith({
      key: "acquisition-events:ip:127.0.0.1",
      limit: 180,
      windowMs: 60_000,
      cacheMs: 500,
      failureMode: "closed",
    });
  });

  it("accepts Korean CTA labels with spaces as aggregate dimensions", async () => {
    mockEnforceRateLimit.mockResolvedValue();
    mockRecordAcquisitionEvent.mockResolvedValue({ ok: true, recorded: true });

    const request = new Request("http://localhost/api/acquisition/events", {
      method: "POST",
      body: JSON.stringify({
        surface: "CAMPAIGN_NEIGHBORHOOD_MAP",
        event: "CAMPAIGN_CTA_CLICKED",
        targetType: "TEMPLATE",
        targetId: "산책코스 추천",
      }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockRecordAcquisitionEvent).toHaveBeenCalledWith({
      surface: "CAMPAIGN_NEIGHBORHOOD_MAP",
      event: "CAMPAIGN_CTA_CLICKED",
      targetType: "TEMPLATE",
      targetId: "산책코스 추천",
    });
  });

  it("records lost-found share funnel events", async () => {
    mockEnforceRateLimit.mockResolvedValue();
    mockRecordAcquisitionEvent.mockResolvedValue({ ok: true, recorded: true });

    const request = new Request("http://localhost/api/acquisition/events", {
      method: "POST",
      body: JSON.stringify({
        surface: "SHARE_PANEL",
        event: "LOST_SHARE_ACTION_CLICKED",
        targetType: "POST",
        targetId: "post-1",
        source: "KAKAO_TEXT_COPY",
      }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockRecordAcquisitionEvent).toHaveBeenCalledWith({
      surface: "SHARE_PANEL",
      event: "LOST_SHARE_ACTION_CLICKED",
      targetType: "POST",
      targetId: "post-1",
      source: "KAKAO_TEXT_COPY",
    });
  });

  it("returns 202 when metric storage is not ready", async () => {
    mockEnforceRateLimit.mockResolvedValue();
    mockRecordAcquisitionEvent.mockResolvedValue({
      ok: false,
      reason: "SCHEMA_SYNC_REQUIRED",
    });

    const request = new Request("http://localhost/api/acquisition/events", {
      method: "POST",
      body: JSON.stringify({
        surface: "CAMPAIGN_NEIGHBORHOOD_MAP",
        event: "CAMPAIGN_VIEWED",
        targetType: "CAMPAIGN",
        targetId: "neighborhood_map",
      }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(payload).toMatchObject({
      ok: true,
      data: { recorded: false, skippedReason: "SCHEMA_SYNC_REQUIRED" },
    });
  });

  it("returns 400 for invalid event payloads", async () => {
    mockEnforceRateLimit.mockResolvedValue();

    const request = new Request("http://localhost/api/acquisition/events", {
      method: "POST",
      body: JSON.stringify({
        surface: "HOME",
        event: "UNKNOWN",
      }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "INVALID_INPUT" },
    });
    expect(mockRecordAcquisitionEvent).not.toHaveBeenCalled();
  });

  it("returns rate limit errors as normalized service errors", async () => {
    mockEnforceRateLimit.mockRejectedValue(
      new ServiceError("요청이 너무 많습니다.", "RATE_LIMITED", 429),
    );

    const request = new Request("http://localhost/api/acquisition/events", {
      method: "POST",
      body: JSON.stringify({ surface: "HOME", event: "LANDING_VIEWED" }),
      headers: { "content-type": "application/json" },
    }) as NextRequest;

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "RATE_LIMITED" },
    });
  });

  it("returns 500 and monitors unexpected errors", async () => {
    mockEnforceRateLimit.mockResolvedValue();
    mockRecordAcquisitionEvent.mockRejectedValue(new Error("db down"));

    const request = new Request("http://localhost/api/acquisition/events", {
      method: "POST",
      body: JSON.stringify({ surface: "HOME", event: "LANDING_VIEWED" }),
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
