import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CareFeedbackIssueType,
  CareFeedbackOutcome,
  CareFeedbackReviewStatus,
} from "@prisma/client";

import {
  CARE_FEEDBACK_QUEUE_PAGE_SIZE,
  getCareFeedbackIssueStats,
  listCareFeedbackIssueQueue,
  summarizeCareFeedbackReviewThresholds,
} from "@/server/queries/care-feedback.queries";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    careCompletionFeedback: {
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  careCompletionFeedback: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
  };
};

function emptyIssueCounts() {
  return Object.values(CareFeedbackIssueType).reduce(
    (acc, issueType) => ({ ...acc, [issueType]: 0 }),
    {} as Record<CareFeedbackIssueType, number>,
  );
}

function emptyReviewStatusCounts() {
  return Object.values(CareFeedbackReviewStatus).reduce(
    (acc, reviewStatus) => ({ ...acc, [reviewStatus]: 0 }),
    {} as Record<CareFeedbackReviewStatus, number>,
  );
}

describe("care feedback queries", () => {
  beforeEach(() => {
    mockPrisma.careCompletionFeedback.count.mockReset();
    mockPrisma.careCompletionFeedback.findMany.mockReset();
    mockPrisma.careCompletionFeedback.groupBy.mockReset();
  });

  it("lists only non-empty issue signals by default", async () => {
    mockPrisma.careCompletionFeedback.count.mockResolvedValue(26);
    mockPrisma.careCompletionFeedback.findMany.mockResolvedValue([{ id: "feedback-26" }]);

    const result = await listCareFeedbackIssueQueue({ page: 2 });

    expect(mockPrisma.careCompletionFeedback.count).toHaveBeenCalledWith({
      where: { issueType: { not: CareFeedbackIssueType.NONE } },
    });
    expect(mockPrisma.careCompletionFeedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { issueType: { not: CareFeedbackIssueType.NONE } },
        skip: CARE_FEEDBACK_QUEUE_PAGE_SIZE,
        take: CARE_FEEDBACK_QUEUE_PAGE_SIZE,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    );
    expect(result.totalCount).toBe(26);
    expect(result.page).toBe(2);
    expect(result.items).toEqual([{ id: "feedback-26" }]);
  });

  it("applies issue and outcome filters", async () => {
    mockPrisma.careCompletionFeedback.count.mockResolvedValue(1);
    mockPrisma.careCompletionFeedback.findMany.mockResolvedValue([{ id: "feedback-safety" }]);

    await listCareFeedbackIssueQueue({
      issueType: CareFeedbackIssueType.SAFETY,
      outcome: CareFeedbackOutcome.ISSUE,
      reviewStatus: CareFeedbackReviewStatus.PENDING,
    });

    expect(mockPrisma.careCompletionFeedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          issueType: CareFeedbackIssueType.SAFETY,
          outcome: CareFeedbackOutcome.ISSUE,
          reviewStatus: CareFeedbackReviewStatus.PENDING,
        },
      }),
    );
  });

  it("aggregates issue and outcome counts for ops", async () => {
    mockPrisma.careCompletionFeedback.count.mockResolvedValue(3);
    mockPrisma.careCompletionFeedback.groupBy
      .mockResolvedValueOnce([
        { issueType: CareFeedbackIssueType.NO_SHOW, _count: { _all: 2 } },
        { issueType: CareFeedbackIssueType.SAFETY, _count: { _all: 1 } },
      ])
      .mockResolvedValueOnce([{ outcome: CareFeedbackOutcome.ISSUE, _count: { _all: 3 } }])
      .mockResolvedValueOnce([
        { reviewStatus: CareFeedbackReviewStatus.PENDING, _count: { _all: 2 } },
        { reviewStatus: CareFeedbackReviewStatus.REVIEWING, _count: { _all: 1 } },
      ]);

    const stats = await getCareFeedbackIssueStats();

    expect(stats.totalCount).toBe(3);
    expect(stats.issueCounts[CareFeedbackIssueType.NO_SHOW]).toBe(2);
    expect(stats.issueCounts[CareFeedbackIssueType.SAFETY]).toBe(1);
    expect(stats.issueCounts[CareFeedbackIssueType.NONE]).toBe(0);
    expect(stats.outcomeCounts[CareFeedbackOutcome.ISSUE]).toBe(3);
    expect(stats.outcomeCounts[CareFeedbackOutcome.POSITIVE]).toBe(0);
    expect(stats.reviewStatusCounts[CareFeedbackReviewStatus.PENDING]).toBe(2);
    expect(stats.reviewStatusCounts[CareFeedbackReviewStatus.REVIEWING]).toBe(1);
    expect(stats.reviewStatusCounts[CareFeedbackReviewStatus.RESOLVED]).toBe(0);
    expect(stats.reviewThresholds.pendingCount).toBe(2);
    expect(stats.reviewThresholds.reviewingCount).toBe(1);
    expect(stats.reviewThresholds.hasHighRiskIssue).toBe(true);
    expect(stats.reviewThresholds.severity).toBe("warning");
  });

  it("summarizes healthy review thresholds without a warning", () => {
    const summary = summarizeCareFeedbackReviewThresholds({
      issueCounts: emptyIssueCounts(),
      reviewStatusCounts: {
        ...emptyReviewStatusCounts(),
        [CareFeedbackReviewStatus.PENDING]: 1,
        [CareFeedbackReviewStatus.REVIEWING]: 1,
      },
    });

    expect(summary.severity).toBe("ok");
    expect(summary.pendingNeedsReview).toBe(false);
    expect(summary.activeReviewBacklog).toBe(false);
    expect(summary.hasHighRiskIssue).toBe(false);
    expect(summary.messages).toEqual(["현재 돌봄 이슈 적체 기준을 넘지 않았습니다."]);
  });

  it("summarizes pending, active, and high-risk review thresholds", () => {
    const summary = summarizeCareFeedbackReviewThresholds({
      issueCounts: {
        ...emptyIssueCounts(),
        [CareFeedbackIssueType.SAFETY]: 1,
        [CareFeedbackIssueType.PAYMENT_OR_FRAUD]: 1,
      },
      reviewStatusCounts: {
        ...emptyReviewStatusCounts(),
        [CareFeedbackReviewStatus.PENDING]: 3,
        [CareFeedbackReviewStatus.REVIEWING]: 2,
      },
    });

    expect(summary.severity).toBe("warning");
    expect(summary.pendingNeedsReview).toBe(true);
    expect(summary.activeReviewBacklog).toBe(true);
    expect(summary.hasHighRiskIssue).toBe(true);
    expect(summary.activeReviewCount).toBe(5);
    expect(summary.highRiskIssueCount).toBe(2);
    expect(summary.messages).toEqual([
      "대기 신호가 3건 이상입니다. 오늘 중 1차 확인이 필요합니다.",
      "대기/검토중 신호가 5건 이상입니다. 처리 우선순위를 조정하세요.",
      "안전/금전 이슈가 있습니다. 관련 돌봄 요청을 먼저 확인하세요.",
    ]);
  });
});
