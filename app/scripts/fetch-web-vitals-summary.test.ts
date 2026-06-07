import { describe, expect, it, vi } from "vitest";

import {
  buildRemoteWebVitalsSummaryUrl,
  fetchRemoteWebVitalsSummary,
  main,
  renderRemoteWebVitalsSummaryMarkdown,
  resolveRemoteWebVitalsOptions,
  runRemoteWebVitalsSummaryCli,
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

  it("prefers the dedicated Web Vitals token over the shared health token", () => {
    const options = resolveRemoteWebVitalsOptions({
      OPS_BASE_URL: "https://townpet.dev",
      OPS_WEB_VITALS_INTERNAL_TOKEN: "web-vitals-token",
      OPS_HEALTH_INTERNAL_TOKEN: "health-token",
      WEB_VITALS_REPORT_OUT: "/tmp/web-vitals.md",
    });

    expect(options.token).toBe("web-vitals-token");
  });

  it("rejects invalid days and limit values before remote fetch", () => {
    expect(() =>
      resolveRemoteWebVitalsOptions({
        OPS_BASE_URL: "https://townpet.dev",
        OPS_HEALTH_INTERNAL_TOKEN: "token",
        WEB_VITALS_REPORT_DAYS: "0",
      }),
    ).toThrow("WEB_VITALS_REPORT_DAYS must be a positive integer");

    expect(() =>
      resolveRemoteWebVitalsOptions({
        OPS_BASE_URL: "https://townpet.dev",
        OPS_HEALTH_INTERNAL_TOKEN: "token",
        WEB_VITALS_REPORT_LIMIT: "1.5",
      }),
    ).toThrow("WEB_VITALS_REPORT_LIMIT must be a positive integer");
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

  it("runs the CLI summary with injected fetcher and report writer", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            status: "OK",
            days: 7,
            limit: 5000,
            schemaSyncRequired: false,
            sampleCount: 1,
            rows: [
              {
                metric: "LCP",
                route: "/feed/guest",
                count: 1,
                p75: 1200,
                p95: 1200,
                goodCount: 1,
                needsImprovementCount: 0,
                poorCount: 0,
                latestAt: "2026-06-06T00:00:00.000Z",
              },
            ],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const mkdir = vi.fn().mockResolvedValue(undefined);
    const writeFile = vi.fn().mockResolvedValue(undefined);

    const result = await runRemoteWebVitalsSummaryCli(
      {
        baseUrl: "https://townpet.dev",
        token: "token",
        days: 7,
        limit: 5000,
        outputPath: "/tmp/web-vitals.md",
      },
      {
        fetchFn: fetchFn as typeof fetch,
        mkdir: mkdir as never,
        writeFile: writeFile as never,
        generatedAt: new Date("2026-06-06T00:00:00.000Z"),
      },
    );

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("Remote Web Vitals summary fetched");
    expect(result.output).toContain("sampleCount: 1");
    expect(mkdir).toHaveBeenCalledWith("/tmp", { recursive: true });
    expect(writeFile).toHaveBeenCalledWith(
      "/tmp/web-vitals.md",
      expect.stringContaining("- generatedAt: `2026-06-06T00:00:00.000Z`"),
      "utf8",
    );
  });

  it("prints CLI output through main on pass", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            status: "NO_SAMPLES",
            days: 7,
            limit: 5000,
            schemaSyncRequired: false,
            sampleCount: 0,
            rows: [],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const output = await main(
      {
        baseUrl: "https://townpet.dev",
        token: "token",
        days: 7,
        limit: 5000,
        outputPath: "/tmp/web-vitals.md",
      },
      {
        fetchFn: fetchFn as typeof fetch,
        mkdir: vi.fn().mockResolvedValue(undefined) as never,
        writeFile: vi.fn().mockResolvedValue(undefined) as never,
      },
    );

    expect(output).toContain("status: NO_SAMPLES");
    expect(log).toHaveBeenCalledWith(output);
  });
});
