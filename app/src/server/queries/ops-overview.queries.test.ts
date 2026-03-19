import { beforeEach, describe, expect, it, vi } from "vitest";

import { getHealthSnapshot } from "@/server/health-overview";
import { getAuthAuditOverview } from "@/server/queries/auth-audit.queries";
import { getFeedPersonalizationOverview } from "@/server/queries/feed-personalization-metrics.queries";
import { getAdminOpsOverview } from "@/server/queries/ops-overview.queries";
import { getReportStats } from "@/server/queries/report.queries";
import { getSearchInsightsOverview } from "@/server/queries/search.queries";

vi.mock("@/server/health-overview", () => ({
  getHealthSnapshot: vi.fn(),
}));

vi.mock("@/server/queries/auth-audit.queries", () => ({
  getAuthAuditOverview: vi.fn(),
}));

vi.mock("@/server/queries/feed-personalization-metrics.queries", () => ({
  getFeedPersonalizationOverview: vi.fn(),
}));

vi.mock("@/server/queries/report.queries", () => ({
  getReportStats: vi.fn(),
}));

vi.mock("@/server/queries/search.queries", () => ({
  getSearchInsightsOverview: vi.fn(),
}));

const mockGetHealthSnapshot = vi.mocked(getHealthSnapshot);
const mockGetAuthAuditOverview = vi.mocked(getAuthAuditOverview);
const mockGetFeedPersonalizationOverview = vi.mocked(getFeedPersonalizationOverview);
const mockGetReportStats = vi.mocked(getReportStats);
const mockGetSearchInsightsOverview = vi.mocked(getSearchInsightsOverview);

describe("ops overview queries", () => {
  beforeEach(() => {
    mockGetHealthSnapshot.mockReset();
    mockGetAuthAuditOverview.mockReset();
    mockGetFeedPersonalizationOverview.mockReset();
    mockGetReportStats.mockReset();
    mockGetSearchInsightsOverview.mockReset();
  });

  it("combines health, auth, report, personalization, and search insights", async () => {
    mockGetHealthSnapshot.mockResolvedValue({
      ok: true,
      status: "ok",
      timestamp: "2026-03-19T00:00:00.000Z",
      uptimeSec: 10,
      durationMs: 20,
      env: { nodeEnv: "production", state: "ok", missing: [] },
      checks: {
        database: { state: "ok", message: "database connected" },
        rateLimit: { backend: "redis", status: "ok", detail: "ok" },
        controlPlane: { state: "ok", checks: [] },
        cache: {
          state: "ok",
          enabled: true,
          backend: "upstash",
          bypassActive: false,
          bypassRemainingMs: 0,
          bypassUntil: null,
          lastFailureAt: null,
          message: "distributed query cache healthy",
        },
        search: { pgTrgm: { state: "ok", enabled: true, message: "enabled" } },
      },
    });
    mockGetAuthAuditOverview.mockResolvedValue({
      days: 1,
      totalEvents: 5,
      actionCounts: {
        PASSWORD_SET: 0,
        PASSWORD_CHANGE: 0,
        PASSWORD_RESET: 0,
        LOGIN_SUCCESS: 2,
        LOGIN_FAILURE: 2,
        LOGIN_RATE_LIMITED: 1,
        REGISTER_SUCCESS: 0,
        REGISTER_REJECTED: 0,
        REGISTER_RATE_LIMITED: 0,
      },
      topFailureReasons: [{ reasonCode: "INVALID_PASSWORD", count: 2 }],
    });
    mockGetReportStats.mockResolvedValue({
      totalCount: 7,
      statusCounts: { PENDING: 2, RESOLVED: 3, DISMISSED: 2 },
      reasonCounts: {
        SPAM: 1,
        HARASSMENT: 0,
        INAPPROPRIATE: 0,
        FAKE: 0,
        FRAUD: 0,
        PRIVACY: 0,
        EMERGENCY: 0,
        OTHER: 0,
      },
      targetCounts: { POST: 6, COMMENT: 1 },
      dailyCounts: [{ date: "2026-03-19", count: 2 }],
      averageResolutionHours: 2.5,
    });
    mockGetFeedPersonalizationOverview.mockResolvedValue({
      days: 7,
      totals: {
        viewCount: 10,
        postClickCount: 3,
        postCtr: 0.3,
        adImpressionCount: 5,
        adClickCount: 1,
        adCtr: 0.2,
      },
      surfaceSummaries: [],
      sourceSummaries: [],
      dailySummaries: [],
      topAudienceSummaries: [],
    });
    mockGetSearchInsightsOverview.mockResolvedValue({
      popularTerms: [],
      zeroResultTerms: [],
      lowResultTerms: [],
    });

    const overview = await getAdminOpsOverview();

    expect(mockGetHealthSnapshot).toHaveBeenCalledWith({ includeDetailedHealth: true });
    expect(overview.health.status).toBe("ok");
    expect(overview.authAudit.totalEvents).toBe(5);
    expect(overview.reports.totalCount).toBe(7);
    expect(overview.personalization.totals.postCtr).toBe(0.3);
    expect(overview.search.zeroResultTerms).toEqual([]);
  });
});
