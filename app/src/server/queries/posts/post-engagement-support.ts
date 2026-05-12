import { PostReactionType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

let postReactionsFieldSupport: boolean | null = null;
let postBookmarksFieldSupport: boolean | null = null;

function isUnknownReactionsIncludeError(error: unknown) {
  return error instanceof Error && error.message.includes("Unknown field `reactions`");
}

export function isMissingPostReactionTableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
    const meta = error.meta as { table?: unknown } | undefined;
    const tableName = typeof meta?.table === "string" ? meta.table : "";
    if (tableName.includes("PostReaction")) {
      return true;
    }
  }

  return (
    error instanceof Error &&
    error.message.includes("PostReaction") &&
    error.message.includes("does not exist")
  );
}

export function isUnavailableReactionsIncludeError(error: unknown) {
  return isUnknownReactionsIncludeError(error) || isMissingPostReactionTableError(error);
}

export function isMissingPostBookmarkTableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
    const meta = error.meta as { table?: unknown } | undefined;
    const tableName = typeof meta?.table === "string" ? meta.table : "";
    if (tableName.includes("PostBookmark")) {
      return true;
    }
  }

  return (
    error instanceof Error &&
    error.message.includes("PostBookmark") &&
    error.message.includes("does not exist")
  );
}

export function supportsPostReactionsField() {
  if (postReactionsFieldSupport !== null) {
    return postReactionsFieldSupport;
  }

  postReactionsFieldSupport = true;
  return true;
}

export function markPostReactionsUnsupported() {
  postReactionsFieldSupport = false;
}

export function supportsPostBookmarksField() {
  if (postBookmarksFieldSupport !== null) {
    return postBookmarksFieldSupport;
  }

  postBookmarksFieldSupport = Boolean(
    (
      prisma as typeof prisma & {
        postBookmark?: {
          findMany: (typeof prisma.postBookmark)["findMany"];
        };
      }
    ).postBookmark,
  );
  return postBookmarksFieldSupport;
}

export function markPostBookmarksUnsupported() {
  postBookmarksFieldSupport = false;
}

export function withEmptyReactions<T extends Record<string, unknown>>(items: T[]) {
  return items.map((item) => ({
    ...item,
    reactions: [] as Array<{ type: PostReactionType }>,
  }));
}

function withBookmarkStateOne<T extends { id: string }>(
  item: T | null,
  bookmarkedPostIds: Set<string>,
): (T & { isBookmarked: boolean }) | null {
  if (!item) {
    return null;
  }

  return {
    ...item,
    isBookmarked: bookmarkedPostIds.has(item.id),
  };
}

function withBookmarkState<T extends { id: string }>(
  items: T[],
  bookmarkedPostIds: Set<string>,
): Array<T & { isBookmarked: boolean }> {
  return items.map((item) => ({
    ...item,
    isBookmarked: bookmarkedPostIds.has(item.id),
  }));
}

async function getBookmarkedPostIdSet(postIds: string[], viewerId?: string) {
  if (!viewerId || postIds.length === 0 || !supportsPostBookmarksField()) {
    return new Set<string>();
  }

  const delegate = (
    prisma as typeof prisma & {
      postBookmark?: {
        findMany: (typeof prisma.postBookmark)["findMany"];
      };
    }
  ).postBookmark;

  if (!delegate) {
    markPostBookmarksUnsupported();
    return new Set<string>();
  }

  try {
    const bookmarks = await delegate.findMany({
      where: {
        userId: viewerId,
        postId: { in: postIds },
      },
      select: { postId: true },
    });
    return new Set(bookmarks.map((bookmark) => bookmark.postId));
  } catch (error) {
    if (!isMissingPostBookmarkTableError(error)) {
      throw error;
    }
    markPostBookmarksUnsupported();
    return new Set<string>();
  }
}

export async function attachBookmarkStateToPosts<T extends { id: string }>(
  items: T[],
  viewerId?: string,
) {
  const bookmarkedPostIds = await getBookmarkedPostIdSet(
    Array.from(new Set(items.map((item) => item.id))),
    viewerId,
  );
  return withBookmarkState(items, bookmarkedPostIds);
}

export async function attachBookmarkStateToPost<T extends { id: string }>(
  item: T | null,
  viewerId?: string,
) {
  const bookmarkedPostIds = await getBookmarkedPostIdSet(item ? [item.id] : [], viewerId);
  return withBookmarkStateOne(item, bookmarkedPostIds);
}
