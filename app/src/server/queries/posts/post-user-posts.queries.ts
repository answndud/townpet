import { PostScope, PostStatus, PostType, Prisma } from "@prisma/client";

import { getEquivalentPostTypes } from "@/lib/post-type-groups";
import { prisma } from "@/lib/prisma";
import {
  isMissingPostBookmarkTableError,
  markPostBookmarksUnsupported,
  supportsPostBookmarksField,
} from "./post-engagement-support";

type UserPostListOptions = {
  authorId: string;
  scope?: PostScope;
  type?: PostType;
  q?: string;
};

type UserPostPageOptions = UserPostListOptions & {
  limit: number;
  page: number;
};

function buildUserPostWhere({
  authorId,
  scope,
  type,
  q,
}: UserPostListOptions): Prisma.PostWhereInput {
  const equivalentTypes = type ? getEquivalentPostTypes(type) : null;

  return {
    authorId,
    status: { in: [PostStatus.ACTIVE, PostStatus.HIDDEN] },
    ...(scope ? { scope } : {}),
    ...(equivalentTypes
      ? {
          type:
            equivalentTypes.length === 1
              ? equivalentTypes[0]
              : {
                  in: equivalentTypes,
                },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { content: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export async function countUserPosts({
  authorId,
  scope,
  type,
  q,
}: UserPostListOptions) {
  return prisma.post.count({
    where: buildUserPostWhere({ authorId, scope, type, q }),
  });
}

export async function listUserPosts({
  authorId,
  scope,
  type,
  q,
}: UserPostListOptions) {
  return prisma.post.findMany({
    where: buildUserPostWhere({ authorId, scope, type, q }),
    orderBy: { createdAt: "desc" },
    include: {
      neighborhood: {
        select: { id: true, name: true, city: true, district: true },
      },
      images: {
        select: { id: true, url: true, order: true },
        orderBy: { order: "asc" },
      },
      hospitalReview: {
        select: {
          hospitalName: true,
          visitPurpose: true,
          animalType: true,
          rating: true,
        },
      },
      placeReview: {
        select: { placeName: true, rating: true, isPetAllowed: true },
      },
      walkRoute: {
        select: { routeName: true, distance: true },
      },
    },
  });
}

export async function listUserPostsPage({
  authorId,
  scope,
  type,
  q,
  limit,
  page,
}: UserPostPageOptions) {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const safePage = Math.max(page, 1);
  const rows = await prisma.post.findMany({
    where: buildUserPostWhere({ authorId, scope, type, q }),
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * safeLimit,
    take: safeLimit + 1,
    select: {
      id: true,
      type: true,
      status: true,
      title: true,
      content: true,
      commentCount: true,
      likeCount: true,
      viewCount: true,
      createdAt: true,
      neighborhood: {
        select: { id: true, name: true, city: true, district: true },
      },
      images: {
        select: { id: true },
      },
    },
  });

  const hasNext = rows.length > safeLimit;
  const items = hasNext ? rows.slice(0, safeLimit) : rows;
  return {
    items,
    hasNext,
  };
}

type UserBookmarkedPostListOptions = {
  userId: string;
  type?: PostType;
  q?: string;
};

type UserBookmarkedPostPageOptions = UserBookmarkedPostListOptions & {
  limit: number;
  page: number;
};

function buildUserBookmarkedPostWhere({
  userId,
  type,
  q,
}: UserBookmarkedPostListOptions): Prisma.PostBookmarkWhereInput {
  const equivalentTypes = type ? getEquivalentPostTypes(type) : null;

  return {
    userId,
    post: {
      status: { in: [PostStatus.ACTIVE, PostStatus.HIDDEN] },
      ...(equivalentTypes
        ? {
            type:
              equivalentTypes.length === 1
                ? equivalentTypes[0]
                : {
                    in: equivalentTypes,
                  },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { content: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
  };
}

export async function countUserBookmarkedPosts({
  userId,
  type,
  q,
}: UserBookmarkedPostListOptions) {
  if (!supportsPostBookmarksField()) {
    return 0;
  }

  return prisma.postBookmark
    .count({
      where: buildUserBookmarkedPostWhere({ userId, type, q }),
    })
    .catch((error) => {
      if (!isMissingPostBookmarkTableError(error)) {
        throw error;
      }
      markPostBookmarksUnsupported();
      return 0;
    });
}

export async function listUserBookmarkedPostsPage({
  userId,
  type,
  q,
  limit,
  page,
}: UserBookmarkedPostPageOptions) {
  if (!supportsPostBookmarksField()) {
    return { items: [], hasNext: false };
  }

  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const safePage = Math.max(page, 1);
  const rows = await prisma.postBookmark
    .findMany({
      where: buildUserBookmarkedPostWhere({ userId, type, q }),
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit + 1,
      select: {
        createdAt: true,
        post: {
          select: {
            id: true,
            type: true,
            status: true,
            title: true,
            content: true,
            commentCount: true,
            likeCount: true,
            viewCount: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                nickname: true,
              },
            },
            neighborhood: {
              select: { id: true, name: true, city: true, district: true },
            },
            images: {
              select: { id: true },
            },
          },
        },
      },
    })
    .catch((error) => {
      if (!isMissingPostBookmarkTableError(error)) {
        throw error;
      }
      markPostBookmarksUnsupported();
      return [];
    });

  const hasNext = rows.length > safeLimit;
  const items = (hasNext ? rows.slice(0, safeLimit) : rows)
    .map((row) =>
      row.post
        ? {
            ...row.post,
            bookmarkedAt: row.createdAt,
            isBookmarked: true,
          }
        : null,
    )
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return {
    items,
    hasNext,
  };
}
