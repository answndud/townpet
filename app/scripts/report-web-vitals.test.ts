import { describe, expect, it } from "vitest";

import {
  parsePositiveIntegerEnv,
  renderMarkdown,
  resolveWebVitalsReportOptions,
} from "./report-web-vitals";

describe("web vitals report env parsing", () => {
  it("uses default report window options when env is empty", () => {
    expect(resolveWebVitalsReportOptions({})).toEqual({
      days: 7,
      limit: 5000,
    });
  });

  it("parses explicit positive integer options", () => {
    expect(
      resolveWebVitalsReportOptions({
        WEB_VITALS_REPORT_DAYS: "14",
        WEB_VITALS_REPORT_LIMIT: "1000",
      }),
    ).toEqual({
      days: 14,
      limit: 1000,
    });
  });

  it("rejects non-positive values", () => {
    expect(() => parsePositiveIntegerEnv("WEB_VITALS_REPORT_DAYS", "0", 7)).toThrow(
      "WEB_VITALS_REPORT_DAYS must be a positive integer. received=0",
    );
    expect(() => parsePositiveIntegerEnv("WEB_VITALS_REPORT_LIMIT", "-1", 5000)).toThrow(
      "WEB_VITALS_REPORT_LIMIT must be a positive integer. received=-1",
    );
  });

  it("rejects non-integer values", () => {
    expect(() => parsePositiveIntegerEnv("WEB_VITALS_REPORT_DAYS", "1.5", 7)).toThrow(
      "WEB_VITALS_REPORT_DAYS must be a positive integer. received=1.5",
    );
    expect(() => parsePositiveIntegerEnv("WEB_VITALS_REPORT_LIMIT", "many", 5000)).toThrow(
      "WEB_VITALS_REPORT_LIMIT must be a positive integer. received=many",
    );
  });

  it("renders schema sync required reports with an actionable status", () => {
    const markdown = renderMarkdown({
      days: 7,
      limit: 5000,
      schemaSyncRequired: true,
      sampleCount: 0,
      rows: [],
    });

    expect(markdown).toContain("- status: `SCHEMA_SYNC_REQUIRED`");
    expect(markdown).toContain("migration과 Prisma client 배포 상태를 먼저 확인");
  });

  it("renders empty reports with a next action", () => {
    const markdown = renderMarkdown({
      days: 7,
      limit: 5000,
      schemaSyncRequired: false,
      sampleCount: 0,
      rows: [],
    });

    expect(markdown).toContain("- status: `NO_SAMPLES`");
    expect(markdown).toContain("production 페이지를 실제 브라우저로 방문");
  });

  it("renders populated reports with interpretation guidance", () => {
    const markdown = renderMarkdown({
      days: 7,
      limit: 5000,
      schemaSyncRequired: false,
      sampleCount: 3,
      rows: [
        {
          metric: "LCP",
          route: "/feed/guest",
          count: 3,
          p75: 1234.56,
          p95: 2345.67,
          goodCount: 2,
          needsImprovementCount: 1,
          poorCount: 0,
          latestAt: new Date("2026-06-06T00:00:00.000Z"),
        },
      ],
    });

    expect(markdown).toContain("## Interpretation");
    expect(markdown).toContain("route별 count가 작으면 trend 판정이 아니라 수집 정상 여부 확인");
    expect(markdown).toContain("| LCP | `/feed/guest` | 3 | 1235 | 2346 | 2 | 1 | 0 | 2026-06-06T00:00:00.000Z |");
  });
});
