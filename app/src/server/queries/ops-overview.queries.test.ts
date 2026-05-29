import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostScope, PostType, SearchTermSearchIn } from "@prisma/client";

import { getHealthSnapshot } from "@/server/health-overview";
import { getAdminQueueSmokeReadiness } from "@/server/queries/admin-queue-smoke-readiness.queries";
import { getCorrectionFlowOpsOverview } from "@/server/queries/acquisition-ops.queries";
import { getAuthAuditOverview } from "@/server/queries/auth-audit.queries";
import { getCareFeedbackIssueStats } from "@/server/queries/care-feedback.queries";
import { getFeedPersonalizationOverview } from "@/server/queries/feed-personalization-metrics.queries";
import { getInitialRegionOpsOverview } from "@/server/queries/initial-region-ops.queries";
import { getAdminOpsOverview } from "@/server/queries/ops-overview.queries";
import { getReportStats } from "@/server/queries/report.queries";
import { getSearchInsightsOverview } from "@/server/queries/search.queries";

vi.mock("@/server/health-overview", () => ({
  getHealthSnapshot: vi.fn(),
}));

vi.mock("@/server/queries/acquisition-ops.queries", () => ({
  getCorrectionFlowOpsOverview: vi.fn(),
}));

vi.mock("@/server/queries/admin-queue-smoke-readiness.queries", () => ({
  getAdminQueueSmokeReadiness: vi.fn(),
}));

vi.mock("@/server/queries/auth-audit.queries", () => ({
  getAuthAuditOverview: vi.fn(),
}));

vi.mock("@/server/queries/feed-personalization-metrics.queries", () => ({
  getFeedPersonalizationOverview: vi.fn(),
}));

vi.mock("@/server/queries/care-feedback.queries", () => ({
  getCareFeedbackIssueStats: vi.fn(),
}));

vi.mock("@/server/queries/initial-region-ops.queries", () => ({
  getInitialRegionOpsOverview: vi.fn(),
}));

vi.mock("@/server/queries/report.queries", () => ({
  getReportStats: vi.fn(),
}));

vi.mock("@/server/queries/search.queries", () => ({
  getSearchInsightsOverview: vi.fn(),
}));

const mockGetHealthSnapshot = vi.mocked(getHealthSnapshot);
const mockGetAdminQueueSmokeReadiness = vi.mocked(getAdminQueueSmokeReadiness);
const mockGetCorrectionFlowOpsOverview = vi.mocked(getCorrectionFlowOpsOverview);
const mockGetAuthAuditOverview = vi.mocked(getAuthAuditOverview);
const mockGetCareFeedbackIssueStats = vi.mocked(getCareFeedbackIssueStats);
const mockGetFeedPersonalizationOverview = vi.mocked(getFeedPersonalizationOverview);
const mockGetInitialRegionOpsOverview = vi.mocked(getInitialRegionOpsOverview);
const mockGetReportStats = vi.mocked(getReportStats);
const mockGetSearchInsightsOverview = vi.mocked(getSearchInsightsOverview);

describe("ops overview queries", () => {
  beforeEach(() => {
    mockGetHealthSnapshot.mockReset();
    mockGetAdminQueueSmokeReadiness.mockReset();
    mockGetCorrectionFlowOpsOverview.mockReset();
    mockGetAuthAuditOverview.mockReset();
    mockGetCareFeedbackIssueStats.mockReset();
    mockGetFeedPersonalizationOverview.mockReset();
    mockGetInitialRegionOpsOverview.mockReset();
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
    mockGetCareFeedbackIssueStats.mockResolvedValue({
      totalCount: 4,
      issueCounts: {
        NONE: 0,
        NO_SHOW: 2,
        SAFETY: 1,
        PAYMENT_OR_FRAUD: 1,
        PRIVACY: 0,
        OTHER: 0,
      },
      outcomeCounts: {
        POSITIVE: 0,
        NEUTRAL: 1,
        ISSUE: 3,
      },
      reviewStatusCounts: {
        PENDING: 2,
        REVIEWING: 1,
        RESOLVED: 1,
        DISMISSED: 0,
      },
      reviewThresholds: {
        pendingCount: 2,
        reviewingCount: 1,
        resolvedCount: 1,
        dismissedCount: 0,
        activeReviewCount: 3,
        highRiskIssueCount: 2,
        pendingNeedsReview: false,
        activeReviewBacklog: false,
        hasHighRiskIssue: true,
        severity: "warning",
        messages: ["안전/금전 이슈가 있습니다. 관련 돌봄 요청을 먼저 확인하세요."],
      },
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
      context: {
        scope: PostScope.GLOBAL,
        typeKey: "ALL",
        searchIn: SearchTermSearchIn.ALL,
      },
      summary: {
        trackedTermCount: 0,
        totalQueryCount: 0,
        totalZeroResultCount: 0,
        zeroResultRate: 0,
      },
      dailyMetrics: [],
      popularTerms: [],
      zeroResultTerms: [],
      lowResultTerms: [],
    });
    mockGetInitialRegionOpsOverview.mockResolvedValue({
      days: 7,
      contentTotals: {
        hospitals: 3,
        walks: 2,
        lost: 1,
        usedMarket: 0,
      },
      topNeighborhoods: [],
      lostFound: {
        activeCount: 1,
        resolvedCount: 1,
        closedCount: 0,
        sightingCommentCount: 2,
      },
      operatorContent: {
        totalCount: 3,
        missingVerificationCount: 1,
        oldestVerifiedAt: "2026-03-10T00:00:00.000Z",
        staleItems: [],
      },
      acquisition: {
        totalEventCount: 10,
        kakaoShareClickCount: 2,
        guideCtaClickCount: 3,
        writeTemplateOpenedCount: 4,
        eventSummaries: [],
      },
      firstParticipation: {
        newUserCount: 5,
        firstPostAuthorCount: 2,
        firstPostRate: 0.4,
        firstPostCount: 3,
        firstPostWithComment24hCount: 1,
        firstPostComment24hRate: 1 / 3,
      },
      retention: {
        cohortUserCount: 4,
        returnedUserCount: 1,
        d7ReturnRate: 0.25,
      },
    });
    mockGetCorrectionFlowOpsOverview.mockResolvedValue({
      days: 7,
      schemaSyncRequired: false,
      viewCount: 10,
      submittedCount: 4,
      receiptCtaClickCount: 2,
      submitRate: 0.4,
      receiptCtaRate: 0.5,
      dailySummaries: [
        {
          day: "2026-05-27",
          viewCount: 10,
          submittedCount: 4,
          receiptCtaClickCount: 2,
          submitRate: 0.4,
          receiptCtaRate: 0.5,
        },
      ],
      eventCounts: [
        { event: "CORRECTION_FLOW_VIEWED", count: 10 },
        { event: "CORRECTION_REQUEST_SUBMITTED", count: 4 },
      ],
      sourceSummaries: [{ source: "operator_content", count: 10 }],
    });
    mockGetAdminQueueSmokeReadiness.mockReturnValue({
      status: "BLOCKED",
      requiredKeys: ["ADMIN_QUEUE_SMOKE_EMAIL", "ADMIN_QUEUE_SMOKE_PASSWORD"],
      missingKeys: ["ADMIN_QUEUE_SMOKE_EMAIL", "ADMIN_QUEUE_SMOKE_PASSWORD"],
      configuredKeys: [],
      command:
        "OPS_BASE_URL=https://townpet.vercel.app COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.3 -C app ops:check:admin-queue-smoke",
      docsPath: "business/operations/배포전_on-demand_체크.md#7-관리자-queue-smoke",
    });

    const overview = await getAdminOpsOverview({
      searchContext: {
        scope: PostScope.LOCAL,
        type: PostType.HOSPITAL_REVIEW,
        searchIn: SearchTermSearchIn.TITLE,
      },
    });

    expect(mockGetHealthSnapshot).toHaveBeenCalledWith({ includeDetailedHealth: true });
    expect(mockGetSearchInsightsOverview).toHaveBeenCalledWith(8, {
      scope: PostScope.LOCAL,
      type: PostType.HOSPITAL_REVIEW,
      searchIn: SearchTermSearchIn.TITLE,
    });
    expect(mockGetInitialRegionOpsOverview).toHaveBeenCalledWith(7);
    expect(mockGetCorrectionFlowOpsOverview).toHaveBeenCalledWith(7);
    expect(mockGetAdminQueueSmokeReadiness).toHaveBeenCalledWith();
    expect(overview.health.status).toBe("ok");
    expect(overview.authAudit.totalEvents).toBe(5);
    expect(overview.reports.totalCount).toBe(7);
    expect(overview.careFeedbacks.totalCount).toBe(4);
    expect(overview.personalization.totals.postCtr).toBe(0.3);
    expect(overview.search.zeroResultTerms).toEqual([]);
    expect(overview.initialRegion.contentTotals.hospitals).toBe(3);
    expect(overview.correctionFlow.submitRate).toBe(0.4);
    expect(overview.adminQueueSmoke.status).toBe("BLOCKED");
  });
});
