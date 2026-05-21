import {
  LostFoundStatus,
  PostStatus,
  PostType,
  Prisma,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { getInitialRegionOpsOverview } from "@/server/queries/initial-region-ops.queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    acquisitionEventStat: {
      findMany: vi.fn(),
    },
    comment: {
      count: vi.fn(),
    },
    lostFoundAlert: {
      groupBy: vi.fn(),
    },
    neighborhood: {
      findMany: vi.fn(),
    },
    post: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  acquisitionEventStat?: {
    findMany: ReturnType<typeof vi.fn>;
  };
  comment: {
    count: ReturnType<typeof vi.fn>;
  };
  lostFoundAlert: {
    groupBy: ReturnType<typeof vi.fn>;
  };
  neighborhood: {
    findMany: ReturnType<typeof vi.fn>;
  };
  post: {
    findMany: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
  };
  user: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("initial region ops queries", () => {
  beforeEach(() => {
    mockPrisma.acquisitionEventStat?.findMany.mockReset();
    mockPrisma.comment.count.mockReset();
    mockPrisma.lostFoundAlert.groupBy.mockReset();
    mockPrisma.neighborhood.findMany.mockReset();
    mockPrisma.post.findMany.mockReset();
    mockPrisma.post.groupBy.mockReset();
    mockPrisma.user.findMany.mockReset();
  });

  it("summarizes local content density, acquisition, first post, and retention signals", async () => {
    const now = new Date();
    const newUserCreatedAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const cohortCreatedAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    mockPrisma.post.groupBy
      .mockResolvedValueOnce([
        { type: PostType.HOSPITAL_REVIEW, _count: { id: 3 } },
        { type: PostType.WALK_ROUTE, _count: { id: 2 } },
        { type: PostType.LOST_FOUND, _count: { id: 1 } },
      ])
      .mockResolvedValueOnce([
        { neighborhoodId: "n-1", _count: { id: 5 } },
      ])
      .mockResolvedValueOnce([
        { neighborhoodId: "n-1", type: PostType.HOSPITAL_REVIEW, _count: { id: 3 } },
        { neighborhoodId: "n-1", type: PostType.WALK_ROUTE, _count: { id: 2 } },
      ])
      .mockResolvedValueOnce([
        { authorId: "user-1", _min: { createdAt: newUserCreatedAt } },
      ]);
    mockPrisma.neighborhood.findMany.mockResolvedValueOnce([
      { id: "n-1", city: "서울특별시", district: "강남구", name: "역삼동" },
    ]);
    mockPrisma.lostFoundAlert.groupBy.mockResolvedValueOnce([
      { status: LostFoundStatus.ACTIVE, _count: { id: 1 } },
      { status: LostFoundStatus.RESOLVED, _count: { id: 2 } },
    ]);
    mockPrisma.comment.count.mockResolvedValueOnce(4);
    mockPrisma.post.findMany
      .mockResolvedValueOnce([
        {
          id: "post-1",
          title: "동물병원 확인",
          type: PostType.HOSPITAL_REVIEW,
          operatorLastVerifiedAt: null,
          neighborhood: { city: "서울특별시", district: "강남구", name: "역삼동" },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "first-post-1",
          authorId: "user-1",
          createdAt: newUserCreatedAt,
          comments: [{ createdAt: new Date(newUserCreatedAt.getTime() + 60_000) }],
        },
        {
          id: "first-post-2",
          authorId: "older-user",
          createdAt: newUserCreatedAt,
          comments: [],
        },
      ]);
    mockPrisma.user.findMany
      .mockResolvedValueOnce([{ id: "user-1", createdAt: newUserCreatedAt }])
      .mockResolvedValueOnce([
        {
          id: "cohort-1",
          createdAt: cohortCreatedAt,
          posts: [{ createdAt: new Date(cohortCreatedAt.getTime() + 8 * 24 * 60 * 60 * 1000) }],
          comments: [],
        },
      ]);
    mockPrisma.acquisitionEventStat?.findMany.mockResolvedValueOnce([
      {
        id: "event-1",
        day: now,
        surface: "GUIDE",
        event: "GUIDE_CTA_CLICKED",
        targetType: "GUIDE",
        targetId: "lost",
        source: "NONE",
        count: 3,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "event-2",
        day: now,
        surface: "POST_CREATE",
        event: "WRITE_TEMPLATE_OPENED",
        targetType: "TEMPLATE",
        targetId: "walk",
        source: "NONE",
        count: 2,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const overview = await getInitialRegionOpsOverview(7);

    expect(mockPrisma.post.groupBy).toHaveBeenNthCalledWith(1, {
      by: ["type"],
      where: {
        status: PostStatus.ACTIVE,
        type: {
          in: [
            PostType.HOSPITAL_REVIEW,
            PostType.WALK_ROUTE,
            PostType.LOST_FOUND,
            PostType.MARKET_LISTING,
          ],
        },
      },
      _count: { id: true },
    });
    expect(overview.contentTotals).toMatchObject({
      hospitals: 3,
      walks: 2,
      lost: 1,
      usedMarket: 0,
    });
    expect(overview.topNeighborhoods[0]).toMatchObject({
      label: "서울특별시 강남구 역삼동",
      totalCount: 5,
      emptyCategoryLabels: ["분실동물", "중고거래"],
    });
    expect(overview.lostFound).toMatchObject({
      activeCount: 1,
      resolvedCount: 2,
      sightingCommentCount: 4,
    });
    expect(overview.acquisition).toMatchObject({
      totalEventCount: 5,
      guideCtaClickCount: 3,
      writeTemplateOpenedCount: 2,
    });
    expect(overview.firstParticipation).toMatchObject({
      newUserCount: 1,
      firstPostAuthorCount: 1,
      firstPostRate: 1,
      firstPostCount: 1,
      firstPostWithComment24hCount: 1,
      firstPostComment24hRate: 1,
    });
    expect(overview.retention).toMatchObject({
      cohortUserCount: 1,
      returnedUserCount: 1,
      d7ReturnRate: 1,
    });
  });

  it("returns empty metrics when the database is unavailable", async () => {
    mockPrisma.post.groupBy.mockRejectedValueOnce(
      new Prisma.PrismaClientInitializationError("db down", "5.22.0"),
    );

    await expect(getInitialRegionOpsOverview(7)).resolves.toMatchObject({
      contentTotals: {
        hospitals: 0,
        walks: 0,
        lost: 0,
        usedMarket: 0,
      },
      topNeighborhoods: [],
      acquisition: { totalEventCount: 0 },
    });
  });
});
