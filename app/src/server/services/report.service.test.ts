import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostType, ReportStatus, ReportTarget, SanctionLevel } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { bulkUpdateReports, createReport } from "@/server/services/report.service";
import { ServiceError } from "@/server/services/service-error";
import { hasBlockingRelation } from "@/server/queries/user-relation.queries";
import { issueNextUserSanction } from "@/server/services/sanction.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    report: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/server/queries/user-relation.queries", () => ({
  hasBlockingRelation: vi.fn(),
}));

vi.mock("@/server/cache/query-cache", () => ({
  bumpFeedCacheVersion: vi.fn().mockResolvedValue(undefined),
  bumpPostDetailCacheVersion: vi.fn().mockResolvedValue(undefined),
  bumpSearchCacheVersion: vi.fn().mockResolvedValue(undefined),
  bumpSuggestCacheVersion: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/services/sanction.service", () => ({
  formatSanctionLevelLabel: vi.fn((level: SanctionLevel) => {
    switch (level) {
      case SanctionLevel.WARNING:
        return "경고";
      case SanctionLevel.SUSPEND_7D:
        return "7일 정지";
      case SanctionLevel.SUSPEND_30D:
        return "30일 정지";
      case SanctionLevel.PERMANENT_BAN:
        return "영구 정지";
      default:
        return level;
    }
  }),
  issueNextUserSanction: vi.fn(),
}));

const mockPrisma = vi.mocked(prisma);
const mockFindFirst = prisma.report.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockHasBlockingRelation = vi.mocked(hasBlockingRelation);
const mockIssueNextUserSanction = vi.mocked(issueNextUserSanction);

describe("report service", () => {
  beforeEach(() => {
    mockPrisma.$transaction.mockReset();
    mockFindFirst.mockReset();
    mockHasBlockingRelation.mockReset();
    mockIssueNextUserSanction.mockReset();
    mockHasBlockingRelation.mockResolvedValue(false);
  });

  it("rejects non-post targets at report creation", async () => {
    await expect(
      createReport({
        reporterId: "user-1",
        input: {
          targetType: "COMMENT",
          targetId: "ckc7k5qsj0000u0t8qv6d1d7k",
          reason: "SPAM",
        },
      }),
    ).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });

    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it("auto-hides only when pending weighted score crosses the threshold", async () => {
    const updatePost = vi.fn().mockResolvedValue(undefined);
    mockFindFirst.mockResolvedValue(null);

    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        post: {
          findUnique: vi.fn().mockResolvedValue({
            authorId: "user-9",
            type: PostType.FREE_BOARD,
          }),
          update: updatePost,
        },
        report: {
          create: vi.fn().mockResolvedValue({ id: "r-new" }),
          findMany: vi.fn().mockResolvedValue([
            {
              reporterId: "user-1",
              createdAt: new Date("2026-03-07T00:00:00.000Z"),
              reason: "SPAM",
              reporter: {
                createdAt: new Date("2025-10-01T00:00:00.000Z"),
                emailVerified: new Date("2025-10-02T00:00:00.000Z"),
                _count: { posts: 8, comments: 12, sanctionsReceived: 0 },
              },
            },
            {
              reporterId: "user-2",
              createdAt: new Date("2026-03-07T00:02:00.000Z"),
              reason: "FAKE",
              reporter: {
                createdAt: new Date("2025-08-01T00:00:00.000Z"),
                emailVerified: new Date("2025-08-02T00:00:00.000Z"),
                _count: { posts: 5, comments: 7, sanctionsReceived: 0 },
              },
            },
          ]),
        },
      } as never),
    );

    await createReport({
      reporterId: "user-3",
      input: {
        targetType: "POST",
        targetId: "cmf0auto0000014tgtarget01",
        reason: "SPAM",
      },
    });

    expect(updatePost).toHaveBeenCalledWith({
      where: { id: "cmf0auto0000014tgtarget01" },
      data: { status: "HIDDEN" },
    });
  });

  it("rejects reports for admin-managed adoption posts", async () => {
    const createReportRow = vi.fn();
    mockFindFirst.mockResolvedValue(null);

    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        post: {
          findUnique: vi.fn().mockResolvedValue({
            authorId: "admin-1",
            type: PostType.ADOPTION_LISTING,
          }),
        },
        report: {
          create: createReportRow,
          findMany: vi.fn(),
        },
      } as never),
    );

    await expect(
      createReport({
        reporterId: "user-3",
        input: {
          targetType: "POST",
          targetId: "cmf0adopt000014tgadminpost",
          reason: "SPAM",
        },
      }),
    ).rejects.toMatchObject({
      code: "REPORT_DISABLED_FOR_POST_TYPE",
      status: 403,
    });

    expect(createReportRow).not.toHaveBeenCalled();
  });

  it("rejects bulk actions for non-post targets", async () => {
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        report: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "r-1",
              status: ReportStatus.PENDING,
              targetType: "COMMENT" as ReportTarget,
              targetId: "c-1",
            },
          ]),
        },
      } as never),
    );

    await expect(
      bulkUpdateReports({
        input: { reportIds: ["r-1"], action: "HIDE_POST" },
        moderatorId: "mod-1",
      }),
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it("rejects bulk actions when already processed reports are selected", async () => {
    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        report: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "r-1",
              status: ReportStatus.RESOLVED,
              targetType: ReportTarget.POST,
              targetId: "post-1",
              targetUserId: "user-1",
              post: { authorId: "user-1" },
            },
          ]),
        },
      } as never),
    );

    await expect(
      bulkUpdateReports({
        input: { reportIds: ["r-1"], action: "RESOLVE" },
        moderatorId: "mod-1",
      }),
    ).rejects.toMatchObject({
      code: "REPORT_ALREADY_PROCESSED",
    });
  });

  it("updates reports in bulk for resolve action without sanctions by default", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const updatePosts = vi.fn();

    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        report: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "r-2",
              status: ReportStatus.PENDING,
              targetType: ReportTarget.POST,
              targetId: "p-1",
              targetUserId: "user-2",
              post: { authorId: "user-2" },
            },
          ]),
          updateMany,
        },
        reportAudit: { createMany },
        post: { updateMany: updatePosts },
      } as never),
    );

    const result = await bulkUpdateReports({
      input: { reportIds: ["r-2"], action: "RESOLVE", resolution: "ok" },
      moderatorId: "mod-1",
    });

    expect(result).toEqual({
      count: 1,
      status: ReportStatus.RESOLVED,
      sanctionCount: 0,
      sanctionLabels: [],
    });
    expect(updateMany).toHaveBeenCalled();
    expect(createMany).toHaveBeenCalled();
    expect(updatePosts).not.toHaveBeenCalled();
    expect(mockIssueNextUserSanction).not.toHaveBeenCalled();
  });

  it("applies one sanction per affected user in bulk resolve flow", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 3 });
    const createMany = vi.fn().mockResolvedValue({ count: 3 });
    mockIssueNextUserSanction
      .mockResolvedValueOnce({
        id: "s-1",
        level: SanctionLevel.WARNING,
      } as never)
      .mockResolvedValueOnce({
        id: "s-2",
        level: SanctionLevel.SUSPEND_7D,
      } as never);

    mockPrisma.$transaction.mockImplementation(async (callback) =>
      callback({
        report: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "r-1",
              status: ReportStatus.PENDING,
              targetType: ReportTarget.POST,
              targetId: "post-1",
              targetUserId: "user-1",
              post: { authorId: "user-1" },
            },
            {
              id: "r-2",
              status: ReportStatus.PENDING,
              targetType: ReportTarget.POST,
              targetId: "post-1",
              targetUserId: "user-1",
              post: { authorId: "user-1" },
            },
            {
              id: "r-3",
              status: ReportStatus.PENDING,
              targetType: ReportTarget.POST,
              targetId: "post-2",
              targetUserId: "user-2",
              post: { authorId: "user-2" },
            },
          ]),
          updateMany,
        },
        reportAudit: { createMany },
        post: { updateMany: vi.fn() },
      } as never),
    );

    const result = await bulkUpdateReports({
      input: {
        reportIds: ["r-1", "r-2", "r-3"],
        action: "RESOLVE",
        resolution: "반복 악용",
        applySanction: true,
      },
      moderatorId: "mod-1",
    });

    expect(mockIssueNextUserSanction).toHaveBeenCalledTimes(2);
    expect(mockIssueNextUserSanction).toHaveBeenNthCalledWith(1, {
      userId: "user-1",
      moderatorId: "mod-1",
      reason: "반복 악용",
      sourceReportId: "r-1",
    });
    expect(mockIssueNextUserSanction).toHaveBeenNthCalledWith(2, {
      userId: "user-2",
      moderatorId: "mod-1",
      reason: "반복 악용",
      sourceReportId: "r-3",
    });
    expect(result).toEqual({
      count: 3,
      status: ReportStatus.RESOLVED,
      sanctionCount: 2,
      sanctionLabels: ["경고", "7일 정지"],
    });
  });
});
