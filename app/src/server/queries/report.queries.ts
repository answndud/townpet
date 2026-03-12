import { Prisma, ReportReason, ReportStatus, ReportTarget } from "@prisma/client";

import { SUPPORTED_REPORT_TARGETS, isSupportedReportTarget } from "@/lib/report-target";
import { prisma } from "@/lib/prisma";

export const REPORT_QUEUE_PAGE_SIZE = 25;

const reportListInclude = {
  reporter: {
    select: {
      id: true,
      email: true,
      nickname: true,
      createdAt: true,
      emailVerified: true,
      _count: {
        select: {
          posts: true,
          comments: true,
          sanctionsReceived: true,
        },
      },
    },
  },
  post: { select: { id: true, title: true, status: true } },
  comment: {
    select: {
      id: true,
      content: true,
      status: true,
      postId: true,
      post: { select: { id: true, title: true } },
    },
  },
} satisfies Prisma.ReportInclude;

type ReportListItem = Prisma.ReportGetPayload<{
  include: typeof reportListInclude;
}>;

type ReportListOptions = {
  status?: ReportStatus | "ALL";
  targetType?: ReportTarget | "ALL";
  page?: number;
  limit?: number;
};

export type ReportListResult = {
  items: ReportListItem[];
  totalCount: number;
  page: number;
  totalPages: number;
  limit: number;
};

export async function listReports({ status, targetType }: ReportListOptions = {}) {
  const statusFilter = status ?? ReportStatus.PENDING;
  const normalizedTargetType =
    targetType && targetType !== "ALL" && isSupportedReportTarget(targetType)
      ? targetType
      : null;
  const where = {
    ...(statusFilter === "ALL" ? {} : { status: statusFilter }),
    targetType: normalizedTargetType ?? { in: [...SUPPORTED_REPORT_TARGETS] },
  } as const;

  return prisma.report.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: reportListInclude,
  });
}

export async function listReportsPage({
  status,
  targetType,
  page,
  limit,
}: ReportListOptions = {}): Promise<ReportListResult> {
  const statusFilter = status ?? ReportStatus.PENDING;
  const normalizedTargetType =
    targetType && targetType !== "ALL" && isSupportedReportTarget(targetType)
      ? targetType
      : null;
  const resolvedLimit = Math.min(Math.max(limit ?? REPORT_QUEUE_PAGE_SIZE, 1), 100);
  const requestedPage = Math.max(page ?? 1, 1);
  const where = {
    ...(statusFilter === "ALL" ? {} : { status: statusFilter }),
    targetType: normalizedTargetType ?? { in: [...SUPPORTED_REPORT_TARGETS] },
  } as const;
  const totalCount = await prisma.report.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / resolvedLimit));
  const resolvedPage = Math.min(requestedPage, totalPages);
  const items = await prisma.report.findMany({
    where,
    skip: (resolvedPage - 1) * resolvedLimit,
    take: resolvedLimit,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: reportListInclude,
  });

  return {
    items,
    totalCount,
    page: resolvedPage,
    totalPages,
    limit: resolvedLimit,
  };
}

export type ReportStats = {
  totalCount: number;
  statusCounts: Record<ReportStatus, number>;
  reasonCounts: Record<ReportReason, number>;
  targetCounts: Partial<Record<ReportTarget, number>>;
  dailyCounts: { date: string; count: number }[];
  averageResolutionHours: number | null;
};

export async function getReportStats(days = 7): Promise<ReportStats> {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (days - 1));

  const [totalCount, statusGroups, reasonGroups, targetGroups, recentDailyGroups, resolutionStats] =
    await Promise.all([
      prisma.report.count({
        where: { targetType: { in: [...SUPPORTED_REPORT_TARGETS] } },
      }),
      prisma.report.groupBy({
        where: { targetType: { in: [...SUPPORTED_REPORT_TARGETS] } },
        by: ["status"],
        orderBy: { status: "asc" },
        _count: { _all: true },
      }),
      prisma.report.groupBy({
        where: { targetType: { in: [...SUPPORTED_REPORT_TARGETS] } },
        by: ["reason"],
        orderBy: { reason: "asc" },
        _count: { _all: true },
      }),
      prisma.report.groupBy({
        where: { targetType: { in: [...SUPPORTED_REPORT_TARGETS] } },
        by: ["targetType"],
        orderBy: { targetType: "asc" },
        _count: { _all: true },
      }),
      prisma.$queryRaw<Array<{ date: string; count: number }>>`
        SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS "date",
               COUNT(*)::int AS "count"
        FROM "Report"
        WHERE "targetType" IN (${Prisma.join([...SUPPORTED_REPORT_TARGETS])})
          AND "createdAt" >= ${startDate}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      prisma.$queryRaw<Array<{ averageResolutionHours: number | null }>>`
        SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600.0)::float8
          AS "averageResolutionHours"
        FROM "Report"
        WHERE "targetType" IN (${Prisma.join([...SUPPORTED_REPORT_TARGETS])})
          AND "resolvedAt" IS NOT NULL
      `,
    ]);

  const statusCounts = Object.values(ReportStatus).reduce(
    (acc, value) => ({ ...acc, [value]: 0 }),
    {} as Record<ReportStatus, number>,
  );
  const getGroupCount = (count: true | { _all?: number } | undefined) =>
    typeof count === "object" && count ? count._all ?? 0 : 0;

  for (const group of statusGroups) {
    statusCounts[group.status] = getGroupCount(group._count);
  }

  const reasonCounts = Object.values(ReportReason).reduce(
    (acc, value) => ({ ...acc, [value]: 0 }),
    {} as Record<ReportReason, number>,
  );
  for (const group of reasonGroups) {
    reasonCounts[group.reason] = getGroupCount(group._count);
  }

  const targetCounts = [...SUPPORTED_REPORT_TARGETS].reduce(
    (acc, value) => ({ ...acc, [value]: 0 }),
    {} as Partial<Record<ReportTarget, number>>,
  );
  for (const group of targetGroups) {
    if (isSupportedReportTarget(group.targetType)) {
      targetCounts[group.targetType] = getGroupCount(group._count);
    }
  }

  const dailyMap = new Map<string, number>();
  for (let i = 0; i < days; i += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    dailyMap.set(date.toISOString().slice(0, 10), 0);
  }

  for (const report of recentDailyGroups) {
    dailyMap.set(report.date, report.count);
  }

  const dailyCounts = Array.from(dailyMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  const averageResolutionHours = resolutionStats[0]?.averageResolutionHours ?? null;

  return {
    totalCount,
    statusCounts,
    reasonCounts,
    targetCounts,
    dailyCounts,
    averageResolutionHours,
  };
}

export async function getReportById(reportId: string) {
  return prisma.report.findUnique({
    where: { id: reportId },
    include: {
      reporter: { select: { id: true, email: true, nickname: true } },
      post: { select: { id: true, title: true, status: true } },
      comment: {
        select: {
          id: true,
          content: true,
          status: true,
          postId: true,
          post: { select: { id: true, title: true } },
        },
      },
    },
  });
}
