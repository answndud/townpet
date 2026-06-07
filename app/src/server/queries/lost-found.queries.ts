import { LostFoundStatus, PostScope, PostStatus, PostType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { resolvePublicGuestDisplayName } from "@/lib/public-guest-identity";
import { resolveUserDisplayName } from "@/lib/user-display";
import { createQueryCacheKey, withQueryCache } from "@/server/cache/query-cache";
import { isPrismaDatabaseUnavailableError } from "@/server/prisma-database-error";

export type PublicLostFoundLandingPost = {
  id: string;
  href: string;
  title: string;
  authorName: string;
  createdAt: Date;
  commentCount: number;
  viewCount: number;
  likeCount: number;
  alert: {
    alertType: "LOST" | "FOUND";
    petType: string;
    breed: string | null;
    lastSeenAt: Date;
    lastSeenLocation: string;
    status: LostFoundStatus;
  };
};

export type PublicLostFoundLandingPayload = {
  activeCount: number;
  recentPosts: PublicLostFoundLandingPost[];
};

const PUBLIC_LOST_FOUND_TTL_SECONDS = 60;

function toPublicLostFoundPost(
  post: Awaited<ReturnType<typeof fetchRecentLostFoundPosts>>[number],
): PublicLostFoundLandingPost {
  return {
    id: post.id,
    href: `/posts/${post.id}/guest`,
    title: post.title,
    authorName: post.guestAuthor
      ? resolvePublicGuestDisplayName(post.guestAuthor.displayName)
      : resolveUserDisplayName(post.author.nickname, "TownPet 회원"),
    createdAt: post.createdAt,
    commentCount: post.commentCount,
    viewCount: post.viewCount,
    likeCount: post.likeCount,
    alert: {
      alertType: post.lostFoundAlert?.alertType ?? "LOST",
      petType: post.lostFoundAlert?.petType ?? "반려동물",
      breed: post.lostFoundAlert?.breed ?? null,
      lastSeenAt: post.lostFoundAlert?.lastSeenAt ?? post.createdAt,
      lastSeenLocation: post.lostFoundAlert?.lastSeenLocation ?? "위치 미확인",
      status: post.lostFoundAlert?.status ?? LostFoundStatus.ACTIVE,
    },
  };
}

function fetchRecentLostFoundPosts(limit: number) {
  return prisma.post.findMany({
    where: {
      type: PostType.LOST_FOUND,
      scope: PostScope.GLOBAL,
      status: PostStatus.ACTIVE,
      lostFoundAlert: {
        status: LostFoundStatus.ACTIVE,
      },
    },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: limit,
    select: {
      id: true,
      title: true,
      createdAt: true,
      commentCount: true,
      likeCount: true,
      viewCount: true,
      author: {
        select: {
          nickname: true,
        },
      },
      guestAuthor: {
        select: {
          displayName: true,
        },
      },
      lostFoundAlert: {
        select: {
          alertType: true,
          petType: true,
          breed: true,
          lastSeenAt: true,
          lastSeenLocation: true,
          status: true,
        },
      },
    },
  });
}

async function fetchPublicLostFoundLandingPayload(limit: number) {
  const [activeCount, recentPosts] = await Promise.all([
    prisma.post.count({
      where: {
        type: PostType.LOST_FOUND,
        scope: PostScope.GLOBAL,
        status: PostStatus.ACTIVE,
        lostFoundAlert: {
          status: LostFoundStatus.ACTIVE,
        },
      },
    }),
    fetchRecentLostFoundPosts(limit),
  ]);

  return {
    activeCount,
    recentPosts: recentPosts.map(toPublicLostFoundPost),
  };
}

export async function getPublicLostFoundLandingPayload({
  limit = 6,
}: {
  limit?: number;
} = {}): Promise<PublicLostFoundLandingPayload> {
  const safeLimit = Math.min(Math.max(limit, 1), 12);
  const cacheKey = await createQueryCacheKey("lost-found-landing", {
    scope: "public",
    limit: safeLimit,
  });

  return withQueryCache({
    key: cacheKey,
    ttlSeconds: PUBLIC_LOST_FOUND_TTL_SECONDS,
    fetcher: () =>
      fetchPublicLostFoundLandingPayload(safeLimit).catch((error) => {
        if (isPrismaDatabaseUnavailableError(error)) {
          return {
            activeCount: 0,
            recentPosts: [],
          };
        }

        throw error;
      }),
  });
}
