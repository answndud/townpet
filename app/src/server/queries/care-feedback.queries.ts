import {
  CareFeedbackIssueType,
  CareFeedbackOutcome,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const CARE_FEEDBACK_QUEUE_PAGE_SIZE = 25;

const careFeedbackQueueInclude = {
  author: { select: { id: true, email: true, nickname: true } },
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

function buildCareFeedbackWhere({ issueType, outcome }: CareFeedbackQueueOptions) {
  return {
    issueType:
      issueType && issueType !== "ALL"
        ? issueType
        : { not: CareFeedbackIssueType.NONE },
    ...(outcome && outcome !== "ALL" ? { outcome } : {}),
  } satisfies Prisma.CareCompletionFeedbackWhereInput;
}

export async function listCareFeedbackIssueQueue({
  issueType,
  outcome,
  page,
  limit,
}: CareFeedbackQueueOptions = {}): Promise<CareFeedbackQueueResult> {
  const resolvedLimit = Math.min(Math.max(limit ?? CARE_FEEDBACK_QUEUE_PAGE_SIZE, 1), 100);
  const requestedPage = Math.max(page ?? 1, 1);
  const where = buildCareFeedbackWhere({ issueType, outcome });
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
  const [totalCount, issueGroups, outcomeGroups] = await Promise.all([
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
  ]);

  const issueCounts = Object.values(CareFeedbackIssueType).reduce(
    (acc, value) => ({ ...acc, [value]: 0 }),
    {} as Record<CareFeedbackIssueType, number>,
  );
  const outcomeCounts = Object.values(CareFeedbackOutcome).reduce(
    (acc, value) => ({ ...acc, [value]: 0 }),
    {} as Record<CareFeedbackOutcome, number>,
  );
  const getGroupCount = (count: true | { _all?: number } | undefined) =>
    typeof count === "object" && count ? count._all ?? 0 : 0;

  for (const group of issueGroups) {
    issueCounts[group.issueType] = getGroupCount(group._count);
  }
  for (const group of outcomeGroups) {
    outcomeCounts[group.outcome] = getGroupCount(group._count);
  }

  return {
    totalCount,
    issueCounts,
    outcomeCounts,
  };
}
