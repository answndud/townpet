import { PostStatus, PostType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { isPrismaDatabaseUnavailableError } from "@/server/prisma-database-error";

export type NeighborhoodMapCampaignStats = {
  hospitalCount: number;
  walkRouteCount: number;
  reportCount: number;
  contributorCount: number;
};

const CAMPAIGN_CONTRIBUTION_TYPES = [
  PostType.HOSPITAL_REVIEW,
  PostType.WALK_ROUTE,
  PostType.PLACE_REVIEW,
  PostType.LOST_FOUND,
  PostType.MARKET_LISTING,
] as const;

async function countActivePostsByType(type: PostType) {
  return prisma.post.count({
    where: {
      status: PostStatus.ACTIVE,
      type,
    },
  });
}

export async function getNeighborhoodMapCampaignStats(): Promise<NeighborhoodMapCampaignStats> {
  try {
    const [hospitalCount, walkRouteCount, reportCount, contributorRows] = await Promise.all([
      countActivePostsByType(PostType.HOSPITAL_REVIEW),
      countActivePostsByType(PostType.WALK_ROUTE),
      prisma.post.count({
        where: {
          status: PostStatus.ACTIVE,
          type: {
            in: [PostType.LOST_FOUND, PostType.PLACE_REVIEW, PostType.MARKET_LISTING],
          },
        },
      }),
      prisma.post.findMany({
        where: {
          status: PostStatus.ACTIVE,
          type: {
            in: [...CAMPAIGN_CONTRIBUTION_TYPES],
          },
        },
        distinct: ["authorId"],
        select: { authorId: true },
        take: 500,
      }),
    ]);

    return {
      hospitalCount,
      walkRouteCount,
      reportCount,
      contributorCount: contributorRows.length,
    };
  } catch (error) {
    if (isPrismaDatabaseUnavailableError(error)) {
      return {
        hospitalCount: 0,
        walkRouteCount: 0,
        reportCount: 0,
        contributorCount: 0,
      };
    }
    throw error;
  }
}
