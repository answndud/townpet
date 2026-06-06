import { describe, expect, it, vi } from "vitest";

import {
  buildRemoteWebVitalsSummaryUrl,
  fetchRemoteWebVitalsSummary,
  renderRemoteWebVitalsSummaryMarkdown,
  resolveRemoteWebVitalsOptions,
} from "./fetch-web-vitals-summary";

describe("remote Web Vitals summary script", () => {
  it("requires a base URL and internal token", () => {
    expect(() => resolveRemoteWebVitalsOptions({})).toThrow("OPS_BASE_URL is required");
    expect(() =>
      resolveRemoteWebVitalsOptions({
        OPS_BASE_URL: "https://townpet.dev",
      }),
    ).toThrow("OPS_WEB_VITALS_INTERNAL_TOKEN or OPS_HEALTH_INTERNAL_TOKEN is required");
  });

  it("builds the protected summary URL with days and limit", () => {
    const options = resolveRemoteWebVitalsOptions({
      OPS_BASE_URL: "https://townpet.dev/",
      OPS_HEALTH_INTERNAL_TOKEN: "token",
      WEB_VITALS_REPORT_DAYS: "14",
      WEB_VITALS_REPORT_LIMIT: "1000",
      WEB_VITALS_REPORT_OUT: "/tmp/web-vitals.md",
    });

    expect(buildRemoteWebVitalsSummaryUrl(options)).toBe(
      "https://townpet.dev/api/ops/web-vitals/summary?days=14&limit=1000",
    );
  });

  it("throws a clear error when the remote API rejects the token", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "FORBIDDEN",
            message: "접근 권한이 없습니다.",
          },
        }),
        { status: 403, headers: { "content-type": "application/json" } },
      ),
    );

    await expect(
      fetchRemoteWebVitalsSummary(
        {
          baseUrl: "https://townpet.dev",
          token: "bad-token",
          days: 7,
          limit: 5000,
          outputPath: "/tmp/web-vitals.md",
        },
        fetchFn as typeof fetch,
      ),
    ).rejects.toThrow("FORBIDDEN");
  });

  it("renders metric rows for a successful remote summary", () => {
    const markdown = renderRemoteWebVitalsSummaryMarkdown({
      generatedAt: new Date("2026-06-06T00:00:00.000Z"),
      baseUrl: "https://townpet.dev",
      summary: {
        status: "OK",
        days: 7,
        limit: 5000,
        schemaSyncRequired: false,
        sampleCount: 1,
        rows: [
          {
            metric: "LCP",
            route: "/",
            count: 1,
            p75: 250.25,
            p95: 250.25,
            goodCount: 1,
            needsImprovementCount: 0,
            poorCount: 0,
            latestAt: "2026-06-06T00:00:00.000Z",
          },
        ],
      },
    });

    expect(markdown).toContain("- status: `OK`");
    expect(markdown).toContain("| LCP | `/` | 1 | 250 | 250 | 1 | 0 | 0 |");
  });
});
