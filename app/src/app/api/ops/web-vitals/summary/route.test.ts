import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/ops/web-vitals/summary/route";
import { runtimeEnv } from "@/lib/env";
import { getWebVitalSummary } from "@/server/queries/web-vitals.queries";
import { getClientIp } from "@/server/request-context";

vi.mock("@/lib/env", () => ({
  runtimeEnv: {
    healthInternalToken: "health-secret",
    isProduction: true,
  },
}));

vi.mock("@/server/queries/web-vitals.queries", () => ({
  getWebVitalSummary: vi.fn(),
}));

vi.mock("@/server/request-context", () => ({
  getClientIp: vi.fn(),
}));

vi.mock("@/server/error-monitor", () => ({
  monitorUnhandledError: vi.fn(),
}));

const mockRuntimeEnv = runtimeEnv as typeof runtimeEnv & {
  healthInternalToken: string;
  isProduction: boolean;
};
const mockGetWebVitalSummary = vi.mocked(getWebVitalSummary);
const mockGetClientIp = vi.mocked(getClientIp);

describe("GET /api/ops/web-vitals/summary", () => {
  beforeEach(() => {
    mockRuntimeEnv.healthInternalToken = "health-secret";
    mockRuntimeEnv.isProduction = true;
    mockGetWebVitalSummary.mockReset();
    mockGetClientIp.mockReset();
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockGetWebVitalSummary.mockResolvedValue({
      days: 7,
      limit: 5000,
      schemaSyncRequired: false,
      sampleCount: 2,
      rows: [
        {
          metric: "LCP",
          route: "/",
          count: 2,
          p75: 300,
          p95: 500,
          goodCount: 2,
          needsImprovementCount: 0,
          poorCount: 0,
          latestAt: new Date("2026-06-06T00:00:00.000Z"),
        },
      ],
    });
  });

  it("rejects production requests without the internal token", async () => {
    const request = new Request("https://townpet.dev/api/ops/web-vitals/summary") as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    expect(mockGetWebVitalSummary).not.toHaveBeenCalled();
  });

  it("returns metric rows for requests with the internal token", async () => {
    const request = new Request("https://townpet.dev/api/ops/web-vitals/summary?days=7&limit=5000", {
      headers: { "x-health-token": "health-secret" },
    }) as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mockGetWebVitalSummary).toHaveBeenCalledWith({ days: 7, limit: 5000 });
    expect(payload).toMatchObject({
      ok: true,
      data: {
        status: "OK",
        sampleCount: 2,
        rows: [
          {
            metric: "LCP",
            route: "/",
            p75: 300,
            p95: 500,
          },
        ],
      },
    });
  });

  it("allows bearer token access for ops clients", async () => {
    const request = new Request("https://townpet.dev/api/ops/web-vitals/summary", {
      headers: { authorization: "Bearer health-secret" },
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it("returns NO_SAMPLES when schema is present but no rows exist", async () => {
    mockGetWebVitalSummary.mockResolvedValue({
      days: 7,
      limit: 5000,
      schemaSyncRequired: false,
      sampleCount: 0,
      rows: [],
    });
    const request = new Request("https://townpet.dev/api/ops/web-vitals/summary", {
      headers: { "x-health-token": "health-secret" },
    }) as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.status).toBe("NO_SAMPLES");
  });

  it("returns SCHEMA_SYNC_REQUIRED when the WebVitalSample table is unavailable", async () => {
    mockGetWebVitalSummary.mockResolvedValue({
      days: 7,
      limit: 5000,
      schemaSyncRequired: true,
      sampleCount: 0,
      rows: [],
    });
    const request = new Request("https://townpet.dev/api/ops/web-vitals/summary", {
      headers: { "x-health-token": "health-secret" },
    }) as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.status).toBe("SCHEMA_SYNC_REQUIRED");
  });

  it("rejects invalid query params before querying", async () => {
    const request = new Request("https://townpet.dev/api/ops/web-vitals/summary?days=0", {
      headers: { "x-health-token": "health-secret" },
    }) as NextRequest;

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("INVALID_QUERY");
    expect(mockGetWebVitalSummary).not.toHaveBeenCalled();
  });

  it("allows local non-production access without a token", async () => {
    mockRuntimeEnv.healthInternalToken = "";
    mockRuntimeEnv.isProduction = false;
    mockGetClientIp.mockReturnValue("anonymous");
    const request = new Request("http://localhost:3000/api/ops/web-vitals/summary") as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
  });
});
