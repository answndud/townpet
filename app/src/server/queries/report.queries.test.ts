import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportReason, ReportStatus, ReportTarget } from "@prisma/client";

import { getReportStats, listReportsPage, REPORT_QUEUE_PAGE_SIZE } from "@/server/queries/report.queries";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    report: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  $queryRaw: ReturnType<typeof vi.fn>;
  report: {
    count: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("report queries", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-25T12:00:00Z"));

    mockPrisma.$queryRaw.mockReset();
    mockPrisma.report.count.mockReset();
    mockPrisma.report.groupBy.mockReset();
    mockPrisma.report.findMany.mockReset();
  });

  it("paginates the report queue on the server", async () => {
    mockPrisma.report.count.mockResolvedValue(61);
    mockPrisma.report.findMany.mockResolvedValue([{ id: "report-26" }, { id: "report-27" }]);

    const result = await listReportsPage({
      status: ReportStatus.PENDING,
      targetType: ReportTarget.POST,
      page: 2,
    });

    expect(mockPrisma.report.count).toHaveBeenCalledWith({
      where: {
        status: ReportStatus.PENDING,
        targetType: ReportTarget.POST,
      },
    });
    expect(mockPrisma.report.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: ReportStatus.PENDING,
          targetType: ReportTarget.POST,
        },
        skip: REPORT_QUEUE_PAGE_SIZE,
        take: REPORT_QUEUE_PAGE_SIZE,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    );
    expect(result.totalCount).toBe(61);
    expect(result.totalPages).toBe(3);
    expect(result.page).toBe(2);
    expect(result.items).toEqual([{ id: "report-26" }, { id: "report-27" }]);
  });

  it("aggregates counts and average resolution without scanning every row in JS", async () => {
    mockPrisma.report.count.mockResolvedValue(4);
    mockPrisma.report.groupBy
      .mockResolvedValueOnce([
        { status: ReportStatus.PENDING, _count: { _all: 2 } },
        { status: ReportStatus.RESOLVED, _count: { _all: 1 } },
        { status: ReportStatus.DISMISSED, _count: { _all: 1 } },
      ])
      .mockResolvedValueOnce([
        { reason: ReportReason.SPAM, _count: { _all: 2 } },
        { reason: ReportReason.OTHER, _count: { _all: 2 } },
      ])
      .mockResolvedValueOnce([
        { targetType: ReportTarget.POST, _count: { _all: 3 } },
        { targetType: ReportTarget.COMMENT, _count: { _all: 1 } },
      ]);
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([
        { date: "2026-01-23", count: 1 },
        { date: "2026-01-25", count: 1 },
      ])
      .mockResolvedValueOnce([{ averageResolutionHours: 3 }]);

    const stats = await getReportStats(7);

    expect(stats.totalCount).toBe(4);
    expect(stats.statusCounts[ReportStatus.PENDING]).toBe(2);
    expect(stats.statusCounts[ReportStatus.RESOLVED]).toBe(1);
    expect(stats.statusCounts[ReportStatus.DISMISSED]).toBe(1);
    expect(stats.reasonCounts[ReportReason.SPAM]).toBe(2);
    expect(stats.reasonCounts[ReportReason.EMERGENCY]).toBe(0);
    expect(stats.reasonCounts[ReportReason.PRIVACY]).toBe(0);
    expect(stats.targetCounts[ReportTarget.POST]).toBe(3);
    expect(stats.targetCounts[ReportTarget.COMMENT]).toBe(1);
    expect(stats.dailyCounts.length).toBeGreaterThanOrEqual(7);
    expect(stats.dailyCounts.reduce((sum, item) => sum + item.count, 0)).toBe(2);
    expect(stats.averageResolutionHours).toBeCloseTo(3, 2);
  });
});
