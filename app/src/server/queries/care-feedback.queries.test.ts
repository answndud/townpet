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
  });
});
