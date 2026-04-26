import {
  CareFeedbackIssueType,
  CareFeedbackOutcome,
  CareFeedbackReviewStatus,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const CARE_FEEDBACK_QUEUE_PAGE_SIZE = 25;
export const CARE_FEEDBACK_PENDING_REVIEW_THRESHOLD = 3;
export const CARE_FEEDBACK_ACTIVE_REVIEW_THRESHOLD = 5;

export type CareFeedbackThresholdSeverity = "ok" | "notice" | "warning";

type CareFeedbackThresholdInput = {
  issueCounts: Record<CareFeedbackIssueType, number>;
  reviewStatusCounts: Record<CareFeedbackReviewStatus, number>;
};

export type CareFeedbackReviewThresholdSummary = {
  pendingCount: number;
  reviewingCount: number;
  resolvedCount: number;
  dismissedCount: number;
  activeReviewCount: number;
  highRiskIssueCount: number;
  pendingNeedsReview: boolean;
  activeReviewBacklog: boolean;
  hasHighRiskIssue: boolean;
  severity: CareFeedbackThresholdSeverity;
  messages: string[];
};

const careFeedbackQueueInclude = {
  author: { select: { id: true, email: true, nickname: true } },
  reviewer: { select: { id: true, email: true, nickname: true } },
  careRequest: {
    select: {
      id: true,
      status: true,
      careType: true,
      startsAt: true,
      post: {
        select: {
          id: true,
          title: true,
          author: { select: { id: true, email: true, nickname: true } },
        },
      },
    },
  },
  careApplication: {
    select: {
      id: true,
      applicant: { select: { id: true, email: true, nickname: true } },
    },
  },
} satisfies Prisma.CareCompletionFeedbackInclude;

export type CareFeedbackQueueItem = Prisma.CareCompletionFeedbackGetPayload<{
  include: typeof careFeedbackQueueInclude;
}>;

type CareFeedbackQueueOptions = {
  issueType?: CareFeedbackIssueType | "ALL";
  outcome?: CareFeedbackOutcome | "ALL";
  reviewStatus?: CareFeedbackReviewStatus | "ALL";
  page?: number;
  limit?: number;
};

export type CareFeedbackQueueResult = {
  items: CareFeedbackQueueItem[];
  totalCount: number;
  page: number;
  totalPages: number;
  limit: number;
};

function buildCareFeedbackWhere({ issueType, outcome, reviewStatus }: CareFeedbackQueueOptions) {
  return {
    issueType:
      issueType && issueType !== "ALL"
        ? issueType
        : { not: CareFeedbackIssueType.NONE },
    ...(outcome && outcome !== "ALL" ? { outcome } : {}),
    ...(reviewStatus && reviewStatus !== "ALL" ? { reviewStatus } : {}),
  } satisfies Prisma.CareCompletionFeedbackWhereInput;
}

export function summarizeCareFeedbackReviewThresholds({
  issueCounts,
  reviewStatusCounts,
}: CareFeedbackThresholdInput): CareFeedbackReviewThresholdSummary {
  const pendingCount = reviewStatusCounts[CareFeedbackReviewStatus.PENDING] ?? 0;
  const reviewingCount = reviewStatusCounts[CareFeedbackReviewStatus.REVIEWING] ?? 0;
  const resolvedCount = reviewStatusCounts[CareFeedbackReviewStatus.RESOLVED] ?? 0;
  const dismissedCount = reviewStatusCounts[CareFeedbackReviewStatus.DISMISSED] ?? 0;
  const activeReviewCount = pendingCount + reviewingCount;
  const highRiskIssueCount =
    (issueCounts[CareFeedbackIssueType.SAFETY] ?? 0) +
    (issueCounts[CareFeedbackIssueType.PAYMENT_OR_FRAUD] ?? 0);
  const pendingNeedsReview = pendingCount >= CARE_FEEDBACK_PENDING_REVIEW_THRESHOLD;
  const activeReviewBacklog = activeReviewCount >= CARE_FEEDBACK_ACTIVE_REVIEW_THRESHOLD;
  const hasHighRiskIssue = highRiskIssueCount > 0;
  const messages: string[] = [];

  if (pendingNeedsReview) {
    messages.push("대기 신호가 3건 이상입니다. 오늘 중 1차 확인이 필요합니다.");
  }
  if (activeReviewBacklog) {
    messages.push("대기/검토중 신호가 5건 이상입니다. 처리 우선순위를 조정하세요.");
  }
  if (hasHighRiskIssue) {
    messages.push("안전/금전 이슈가 있습니다. 관련 돌봄 요청을 먼저 확인하세요.");
  }
  if (messages.length === 0) {
    messages.push("현재 돌봄 이슈 적체 기준을 넘지 않았습니다.");
  }

  return {
    pendingCount,
    reviewingCount,
    resolvedCount,
    dismissedCount,
    activeReviewCount,
    highRiskIssueCount,
    pendingNeedsReview,
    activeReviewBacklog,
    hasHighRiskIssue,
    severity: activeReviewBacklog || hasHighRiskIssue ? "warning" : pendingNeedsReview ? "notice" : "ok",
    messages,
  };
}

export async function listCareFeedbackIssueQueue({
  issueType,
  outcome,
  reviewStatus,
  page,
  limit,
}: CareFeedbackQueueOptions = {}): Promise<CareFeedbackQueueResult> {
  const resolvedLimit = Math.min(Math.max(limit ?? CARE_FEEDBACK_QUEUE_PAGE_SIZE, 1), 100);
  const requestedPage = Math.max(page ?? 1, 1);
  const where = buildCareFeedbackWhere({ issueType, outcome, reviewStatus });
  const totalCount = await prisma.careCompletionFeedback.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / resolvedLimit));
  const resolvedPage = Math.min(requestedPage, totalPages);
  const items = await prisma.careCompletionFeedback.findMany({
    where,
    skip: (resolvedPage - 1) * resolvedLimit,
    take: resolvedLimit,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: careFeedbackQueueInclude,
  });

  return {
    items,
    totalCount,
    page: resolvedPage,
    totalPages,
    limit: resolvedLimit,
  };
}

export async function getCareFeedbackIssueStats() {
  const [totalCount, issueGroups, outcomeGroups, reviewStatusGroups] = await Promise.all([
    prisma.careCompletionFeedback.count({
      where: { issueType: { not: CareFeedbackIssueType.NONE } },
    }),
    prisma.careCompletionFeedback.groupBy({
      where: { issueType: { not: CareFeedbackIssueType.NONE } },
      by: ["issueType"],
      orderBy: { issueType: "asc" },
      _count: { _all: true },
    }),
    prisma.careCompletionFeedback.groupBy({
      where: { issueType: { not: CareFeedbackIssueType.NONE } },
      by: ["outcome"],
      orderBy: { outcome: "asc" },
      _count: { _all: true },
    }),
    prisma.careCompletionFeedback.groupBy({
      where: { issueType: { not: CareFeedbackIssueType.NONE } },
      by: ["reviewStatus"],
      orderBy: { reviewStatus: "asc" },
      _count: { _all: true },
    }),
  ]);

  const issueCounts = Object.values(CareFeedbackIssueType).reduce(
    (acc, value) => ({ ...acc, [value]: 0 }),
    {} as Record<CareFeedbackIssueType, number>,
  );
  const outcomeCounts = Object.values(CareFeedbackOutcome).reduce(
    (acc, value) => ({ ...acc, [value]: 0 }),
    {} as Record<CareFeedbackOutcome, number>,
  );
  const reviewStatusCounts = Object.values(CareFeedbackReviewStatus).reduce(
    (acc, value) => ({ ...acc, [value]: 0 }),
    {} as Record<CareFeedbackReviewStatus, number>,
  );
  const getGroupCount = (count: true | { _all?: number } | undefined) =>
    typeof count === "object" && count ? count._all ?? 0 : 0;

  for (const group of issueGroups) {
    issueCounts[group.issueType] = getGroupCount(group._count);
  }
  for (const group of outcomeGroups) {
    outcomeCounts[group.outcome] = getGroupCount(group._count);
  }
  for (const group of reviewStatusGroups) {
    reviewStatusCounts[group.reviewStatus] = getGroupCount(group._count);
  }

  return {
    totalCount,
    issueCounts,
    outcomeCounts,
    reviewStatusCounts,
    reviewThresholds: summarizeCareFeedbackReviewThresholds({ issueCounts, reviewStatusCounts }),
  };
}
