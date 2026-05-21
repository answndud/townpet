import {
  LostFoundStatus,
  PostStatus,
  PostType,
  Prisma,
  type AcquisitionEventStat,
} from "@prisma/client";

import { ACQUISITION_EVENT_LABELS } from "@/lib/acquisition-events";
import { prisma } from "@/lib/prisma";
import { isPrismaDatabaseUnavailableError } from "@/server/prisma-database-error";

const DEFAULT_DAYS = 7;
const FIRST_COMMENT_WINDOW_MS = 24 * 60 * 60 * 1000;

const READINESS_CATEGORIES = [
  { key: "hospitals", label: "병원 정보", types: [PostType.HOSPITAL_REVIEW] },
  { key: "walks", label: "산책코스", types: [PostType.WALK_ROUTE] },
  { key: "lost", label: "분실동물", types: [PostType.LOST_FOUND] },
  { key: "usedMarket", label: "중고거래", types: [PostType.MARKET_LISTING] },
] as const;

type ReadinessCategoryKey = (typeof READINESS_CATEGORIES)[number]["key"];

export type InitialRegionOpsOverview = {
  days: number;
  contentTotals: Record<ReadinessCategoryKey, number>;
  topNeighborhoods: Array<{
    neighborhoodId: string;
    label: string;
    totalCount: number;
    categories: Record<ReadinessCategoryKey, number>;
    emptyCategoryLabels: string[];
  }>;
  lostFound: {
    activeCount: number;
    resolvedCount: number;
    closedCount: number;
    sightingCommentCount: number;
  };
  operatorContent: {
    totalCount: number;
    missingVerificationCount: number;
    oldestVerifiedAt: string | null;
    staleItems: Array<{
      postId: string;
      title: string;
      type: PostType;
      neighborhoodLabel: string;
      operatorLastVerifiedAt: string | null;
    }>;
  };
  acquisition: {
    totalEventCount: number;
    kakaoShareClickCount: number;
    guideCtaClickCount: number;
    writeTemplateOpenedCount: number;
    eventSummaries: Array<{
      event: string;
      label: string;
      count: number;
    }>;
  };
  firstParticipation: {
    newUserCount: number;
    firstPostAuthorCount: number;
    firstPostRate: number;
    firstPostCount: number;
    firstPostWithComment24hCount: number;
    firstPostComment24hRate: number;
  };
  retention: {
    cohortUserCount: number;
    returnedUserCount: number;
    d7ReturnRate: number;
  };
};

function getStartDay(days: number) {
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  day.setUTCDate(day.getUTCDate() - (days - 1));
  return day;
}

function getCohortStartDay(days: number) {
  const day = getStartDay(days * 2);
  return day;
}

function toIsoDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function createCategoryRecord(): Record<ReadinessCategoryKey, number> {
  return {
    hospitals: 0,
    walks: 0,
    lost: 0,
    usedMarket: 0,
  };
}

function getCategoryKeyForPostType(type: PostType): ReadinessCategoryKey | null {
  const category = READINESS_CATEGORIES.find((item) =>
    (item.types as readonly PostType[]).includes(type),
  );
  return category?.key ?? null;
}

function getAcquisitionEventStatDelegate() {
  return (
    prisma as typeof prisma & {
      acquisitionEventStat?: {
        findMany: (typeof prisma.acquisitionEventStat)["findMany"];
      };
    }
  ).acquisitionEventStat;
}

function isMissingAcquisitionEventSchemaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code !== "P2021" && error.code !== "P2022") {
      return false;
    }

    const tableName = String(error.meta?.table ?? "");
    const columnName = String(error.meta?.column ?? "");
    return (
      tableName.includes("AcquisitionEventStat") ||
      columnName.includes("AcquisitionEventStat")
    );
  }

  return (
    error instanceof Error &&
    error.message.includes("AcquisitionEventStat") &&
    (error.message.includes("does not exist") ||
      error.message.includes("Unknown field") ||
      error.message.includes("Unknown arg"))
  );
}

async function getAcquisitionRows(startDay: Date): Promise<AcquisitionEventStat[]> {
  const delegate = getAcquisitionEventStatDelegate();
  if (!delegate) {
    return [];
  }

  try {
    return await delegate.findMany({
      where: {
        day: { gte: startDay },
      },
      orderBy: [{ event: "asc" }, { count: "desc" }],
    });
  } catch (error) {
    if (isMissingAcquisitionEventSchemaError(error)) {
      return [];
    }
    throw error;
  }
}

function summarizeAcquisitionRows(rows: AcquisitionEventStat[]) {
  const eventMap = new Map<string, number>();
  let totalEventCount = 0;

  for (const row of rows) {
    totalEventCount += row.count;
    eventMap.set(row.event, (eventMap.get(row.event) ?? 0) + row.count);
  }

  return {
    totalEventCount,
    kakaoShareClickCount: eventMap.get("KAKAO_SHARE_CLICKED") ?? 0,
    guideCtaClickCount: eventMap.get("GUIDE_CTA_CLICKED") ?? 0,
    writeTemplateOpenedCount: eventMap.get("WRITE_TEMPLATE_OPENED") ?? 0,
    eventSummaries: Array.from(eventMap.entries())
      .map(([event, count]) => ({
        event,
        label:
          ACQUISITION_EVENT_LABELS[event as keyof typeof ACQUISITION_EVENT_LABELS] ??
          event,
        count,
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 8),
  };
}

function calculateRate(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

export async function getInitialRegionOpsOverview(
  days = DEFAULT_DAYS,
): Promise<InitialRegionOpsOverview> {
  const startDay = getStartDay(days);
  const cohortStartDay = getCohortStartDay(days);
  const keyTypes = READINESS_CATEGORIES.flatMap((category) => [...category.types]);

  try {
    const [
      totalTypeRows,
      neighborhoodRows,
      neighborhoodTypeRows,
      lostStatusRows,
      sightingCommentCount,
      operatorContentRows,
      newUsers,
      firstPostRows,
      recentFirstPosts,
      retentionUsers,
      acquisitionRows,
    ] = await Promise.all([
      prisma.post.groupBy({
        by: ["type"],
        where: {
          status: PostStatus.ACTIVE,
          type: { in: keyTypes },
        },
        _count: { id: true },
      }),
      prisma.post.groupBy({
        by: ["neighborhoodId"],
        where: {
          status: PostStatus.ACTIVE,
          neighborhoodId: { not: null },
          type: { in: keyTypes },
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 8,
      }),
      prisma.post.groupBy({
        by: ["neighborhoodId", "type"],
        where: {
          status: PostStatus.ACTIVE,
          neighborhoodId: { not: null },
          type: { in: keyTypes },
        },
        _count: { id: true },
      }),
      prisma.lostFoundAlert.groupBy({
        by: ["status"],
        where: {
          post: {
            status: PostStatus.ACTIVE,
          },
        },
        _count: { id: true },
      }),
      prisma.comment.count({
        where: {
          kind: "LOST_FOUND_SIGHTING",
          status: PostStatus.ACTIVE,
          createdAt: { gte: startDay },
        },
      }),
      prisma.post.findMany({
        where: {
          status: PostStatus.ACTIVE,
          isOperatorContent: true,
          type: { in: [PostType.HOSPITAL_REVIEW, PostType.PLACE_REVIEW, PostType.PRODUCT_REVIEW] },
        },
        orderBy: [
          { operatorLastVerifiedAt: "asc" },
          { updatedAt: "asc" },
        ],
        select: {
          id: true,
          title: true,
          type: true,
          operatorLastVerifiedAt: true,
          neighborhood: {
            select: {
              city: true,
              district: true,
              name: true,
            },
          },
        },
        take: 500,
      }),
      prisma.user.findMany({
        where: {
          createdAt: { gte: startDay },
        },
        select: {
          id: true,
          createdAt: true,
        },
        take: 1000,
      }),
      prisma.post.groupBy({
        by: ["authorId"],
        where: {
          createdAt: { gte: startDay },
        },
        _min: { createdAt: true },
      }),
      prisma.post.findMany({
        where: {
          createdAt: { gte: startDay },
          status: PostStatus.ACTIVE,
        },
        select: {
          id: true,
          authorId: true,
          createdAt: true,
          comments: {
            where: {
              status: PostStatus.ACTIVE,
            },
            orderBy: { createdAt: "asc" },
            select: { createdAt: true },
            take: 1,
          },
        },
        take: 500,
      }),
      prisma.user.findMany({
        where: {
          createdAt: {
            gte: cohortStartDay,
            lt: startDay,
          },
        },
        select: {
          id: true,
          createdAt: true,
          posts: {
            where: { status: PostStatus.ACTIVE },
            select: { createdAt: true },
            take: 20,
          },
          comments: {
            where: { status: PostStatus.ACTIVE },
            select: { createdAt: true },
            take: 20,
          },
        },
        take: 500,
      }),
      getAcquisitionRows(startDay),
    ]);

    const neighborhoodIds = neighborhoodRows
      .map((row) => row.neighborhoodId)
      .filter((id): id is string => Boolean(id));
    const resolvedNeighborhoods = neighborhoodIds.length
      ? await prisma.neighborhood.findMany({
          where: {
            id: { in: neighborhoodIds },
          },
          select: {
            id: true,
            city: true,
            district: true,
            name: true,
          },
        })
      : [];
    const neighborhoodMap = new Map(
      resolvedNeighborhoods.map((neighborhood) => [neighborhood.id, neighborhood]),
    );

    const contentTotals = createCategoryRecord();
    for (const row of totalTypeRows) {
      const key = getCategoryKeyForPostType(row.type);
      if (key) {
        contentTotals[key] += row._count.id;
      }
    }

    const neighborhoodCategoryMap = new Map<string, Record<ReadinessCategoryKey, number>>();
    for (const row of neighborhoodTypeRows) {
      if (!row.neighborhoodId) {
        continue;
      }
      const key = getCategoryKeyForPostType(row.type);
      if (!key) {
        continue;
      }
      const categories =
        neighborhoodCategoryMap.get(row.neighborhoodId) ?? createCategoryRecord();
      categories[key] += row._count.id;
      neighborhoodCategoryMap.set(row.neighborhoodId, categories);
    }

    const topNeighborhoods = neighborhoodRows
      .filter((row) => row.neighborhoodId)
      .map((row) => {
        const neighborhood = neighborhoodMap.get(row.neighborhoodId ?? "");
        const categories =
          neighborhoodCategoryMap.get(row.neighborhoodId ?? "") ?? createCategoryRecord();
        const emptyCategoryLabels = READINESS_CATEGORIES.filter(
          (category) => categories[category.key] === 0,
        ).map((category) => category.label);

        return {
          neighborhoodId: row.neighborhoodId ?? "unknown",
          label: neighborhood
            ? `${neighborhood.city} ${neighborhood.district} ${neighborhood.name}`
            : row.neighborhoodId ?? "알 수 없는 동네",
          totalCount: row._count.id,
          categories,
          emptyCategoryLabels,
        };
      });

    const lostFound = {
      activeCount:
        lostStatusRows.find((row) => row.status === LostFoundStatus.ACTIVE)?._count.id ?? 0,
      resolvedCount:
        lostStatusRows.find((row) => row.status === LostFoundStatus.RESOLVED)?._count.id ?? 0,
      closedCount:
        lostStatusRows.find((row) => row.status === LostFoundStatus.CLOSED)?._count.id ?? 0,
      sightingCommentCount,
    };

    const operatorContent = {
      totalCount: operatorContentRows.length,
      missingVerificationCount: operatorContentRows.filter(
        (post) => !post.operatorLastVerifiedAt,
      ).length,
      oldestVerifiedAt:
        toIsoDate(
          operatorContentRows
            .map((post) => post.operatorLastVerifiedAt)
            .filter((date): date is Date => Boolean(date))
            .sort((left, right) => left.getTime() - right.getTime())[0],
        ),
      staleItems: operatorContentRows.slice(0, 6).map((post) => ({
        postId: post.id,
        title: post.title,
        type: post.type,
        neighborhoodLabel: post.neighborhood
          ? `${post.neighborhood.city} ${post.neighborhood.district} ${post.neighborhood.name}`
          : "지역 없음",
        operatorLastVerifiedAt: toIsoDate(post.operatorLastVerifiedAt),
      })),
    };

    const newUserIds = new Set(newUsers.map((user) => user.id));
    const firstPostAuthorCount = firstPostRows.filter((row) =>
      newUserIds.has(row.authorId),
    ).length;
    const firstPostByNewAuthor = new Map<string, (typeof recentFirstPosts)[number]>();
    for (const post of recentFirstPosts) {
      if (!newUserIds.has(post.authorId)) {
        continue;
      }
      const existing = firstPostByNewAuthor.get(post.authorId);
      if (!existing || post.createdAt < existing.createdAt) {
        firstPostByNewAuthor.set(post.authorId, post);
      }
    }
    const firstPosts = Array.from(firstPostByNewAuthor.values());
    const firstPostWithComment24hCount = firstPosts.filter((post) => {
      const firstComment = post.comments[0]?.createdAt;
      return (
        firstComment &&
        firstComment.getTime() - post.createdAt.getTime() <= FIRST_COMMENT_WINDOW_MS
      );
    }).length;

    const returnedUserCount = retentionUsers.filter((user) => {
      const returnAfter = user.createdAt.getTime() + days * 24 * 60 * 60 * 1000;
      return [...user.posts, ...user.comments].some(
        (activity) => activity.createdAt.getTime() >= returnAfter,
      );
    }).length;

    return {
      days,
      contentTotals,
      topNeighborhoods,
      lostFound,
      operatorContent,
      acquisition: summarizeAcquisitionRows(acquisitionRows),
      firstParticipation: {
        newUserCount: newUsers.length,
        firstPostAuthorCount,
        firstPostRate: calculateRate(firstPostAuthorCount, newUsers.length),
        firstPostCount: firstPosts.length,
        firstPostWithComment24hCount,
        firstPostComment24hRate: calculateRate(
          firstPostWithComment24hCount,
          firstPosts.length,
        ),
      },
      retention: {
        cohortUserCount: retentionUsers.length,
        returnedUserCount,
        d7ReturnRate: calculateRate(returnedUserCount, retentionUsers.length),
      },
    };
  } catch (error) {
    if (isPrismaDatabaseUnavailableError(error)) {
      return {
        days,
        contentTotals: createCategoryRecord(),
        topNeighborhoods: [],
        lostFound: {
          activeCount: 0,
          resolvedCount: 0,
          closedCount: 0,
          sightingCommentCount: 0,
        },
        operatorContent: {
          totalCount: 0,
          missingVerificationCount: 0,
          oldestVerifiedAt: null,
          staleItems: [],
        },
        acquisition: summarizeAcquisitionRows([]),
        firstParticipation: {
          newUserCount: 0,
          firstPostAuthorCount: 0,
          firstPostRate: 0,
          firstPostCount: 0,
          firstPostWithComment24hCount: 0,
          firstPostComment24hRate: 0,
        },
        retention: {
          cohortUserCount: 0,
          returnedUserCount: 0,
          d7ReturnRate: 0,
        },
      };
    }
    throw error;
  }
}
