import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  buildLegacyPostListSelect,
  buildLegacyPostListSelectWithoutReactions,
} from "./post-legacy-selects";
import {
  buildPostListInclude,
  buildPostListIncludeWithoutReactions,
} from "./post-list-includes";
import {
  isUnavailableReactionsIncludeError,
  markPostReactionsUnsupported,
  withEmptyReactions,
} from "./post-engagement-support";
import { withEmptyGuestPostMeta } from "./post-guest-meta-fallback";

type PostListFindManyBaseArgs = Omit<Prisma.PostFindManyArgs, "include" | "select">;
type PostListFetchRow =
  | Prisma.PostGetPayload<{ include: ReturnType<typeof buildPostListInclude> }>
  | Prisma.PostGetPayload<{ include: ReturnType<typeof buildPostListIncludeWithoutReactions> }>
  | Prisma.PostGetPayload<{ select: ReturnType<typeof buildLegacyPostListSelect> }>
  | Prisma.PostGetPayload<{ select: ReturnType<typeof buildLegacyPostListSelectWithoutReactions> }>;

export type PostListFetchFallbackHandlers = {
  isUnknownGuestPostColumnError: (error: unknown) => boolean;
  isUnknownGuestAuthorIncludeError: (error: unknown) => boolean;
  isMissingCommunityBoardSchemaError: (error: unknown) => boolean;
  isUnsupportedReviewCategoryFilterError: (error: unknown) => boolean;
  onUnsupportedReviewCategoryFilter: () => void;
};

function buildPostFindManyFallbackArgs<T extends { where?: Prisma.PostWhereInput }>({
  error,
  baseArgs,
  legacyCompatibleWhere,
  legacyReviewWhere,
  handlers,
}: {
  error: unknown;
  baseArgs: T;
  legacyCompatibleWhere: Prisma.PostWhereInput;
  legacyReviewWhere: Prisma.PostWhereInput;
  handlers: PostListFetchFallbackHandlers;
}) {
  const safeBaseArgs = handlers.isMissingCommunityBoardSchemaError(error)
    ? { ...baseArgs, where: legacyCompatibleWhere }
    : baseArgs;

  return handlers.isUnsupportedReviewCategoryFilterError(error)
    ? { ...safeBaseArgs, where: legacyReviewWhere }
    : safeBaseArgs;
}

function isRecoverablePostListFetchError(
  error: unknown,
  handlers: PostListFetchFallbackHandlers,
  options?: { includeReactions?: boolean },
) {
  return (
    (options?.includeReactions ? isUnavailableReactionsIncludeError(error) : false) ||
    handlers.isUnknownGuestPostColumnError(error) ||
    handlers.isUnknownGuestAuthorIncludeError(error) ||
    handlers.isMissingCommunityBoardSchemaError(error) ||
    handlers.isUnsupportedReviewCategoryFilterError(error)
  );
}

function applyPostListFetchFallbackSideEffects(
  error: unknown,
  handlers: PostListFetchFallbackHandlers,
) {
  if (isUnavailableReactionsIncludeError(error)) {
    markPostReactionsUnsupported();
  }

  if (handlers.isUnsupportedReviewCategoryFilterError(error)) {
    handlers.onUnsupportedReviewCategoryFilter();
  }
}

export async function fetchPostRowsWithoutReactionsWithFallback({
  baseArgs,
  legacyCompatibleWhere,
  legacyReviewWhere,
  includeGuestAuthor,
  handlers,
}: {
  baseArgs: PostListFindManyBaseArgs;
  legacyCompatibleWhere: Prisma.PostWhereInput;
  legacyReviewWhere: Prisma.PostWhereInput;
  includeGuestAuthor: boolean;
  handlers: PostListFetchFallbackHandlers;
}): Promise<PostListFetchRow[]> {
  const rows = await prisma.post
    .findMany({
      ...baseArgs,
      include: buildPostListIncludeWithoutReactions(includeGuestAuthor),
    })
    .catch(async (error) => {
      if (!isRecoverablePostListFetchError(error, handlers)) {
        throw error;
      }

      applyPostListFetchFallbackSideEffects(error, handlers);

      const safeFallbackBaseArgs = buildPostFindManyFallbackArgs({
        error,
        baseArgs,
        legacyCompatibleWhere,
        legacyReviewWhere,
        handlers,
      });

      if (handlers.isUnknownGuestAuthorIncludeError(error)) {
        return prisma.post.findMany({
          ...safeFallbackBaseArgs,
          include: buildPostListIncludeWithoutReactions(false),
        });
      }

      return prisma.post.findMany({
        ...safeFallbackBaseArgs,
        select: buildLegacyPostListSelectWithoutReactions(),
      });
    });

  return withEmptyReactions(withEmptyGuestPostMeta(rows as PostListFetchRow[]));
}

export async function fetchPostRowsWithReactionsWithFallback({
  baseArgs,
  legacyCompatibleWhere,
  legacyReviewWhere,
  includeViewerReactions,
  viewerId,
  includeGuestAuthor,
  noViewerId,
  handlers,
}: {
  baseArgs: PostListFindManyBaseArgs;
  legacyCompatibleWhere: Prisma.PostWhereInput;
  legacyReviewWhere: Prisma.PostWhereInput;
  includeViewerReactions: boolean;
  viewerId?: string;
  includeGuestAuthor: boolean;
  noViewerId: string;
  handlers: PostListFetchFallbackHandlers;
}): Promise<PostListFetchRow[]> {
  return prisma.post
    .findMany({
      ...baseArgs,
      include: includeViewerReactions
        ? buildPostListInclude(viewerId, includeGuestAuthor, noViewerId)
        : buildPostListIncludeWithoutReactions(includeGuestAuthor),
    })
    .then((rows) =>
      includeViewerReactions
        ? (rows as PostListFetchRow[])
        : withEmptyReactions(rows as PostListFetchRow[]),
    )
    .catch(async (error) => {
      if (!isRecoverablePostListFetchError(error, handlers, { includeReactions: true })) {
        throw error;
      }

      applyPostListFetchFallbackSideEffects(error, handlers);

      const safeFallbackBaseArgs = buildPostFindManyFallbackArgs({
        error,
        baseArgs,
        legacyCompatibleWhere,
        legacyReviewWhere,
        handlers,
      });

      if (handlers.isUnknownGuestAuthorIncludeError(error)) {
        const rows = await prisma.post.findMany({
          ...safeFallbackBaseArgs,
          include: includeViewerReactions
            ? buildPostListInclude(viewerId, false, noViewerId)
            : buildPostListIncludeWithoutReactions(false),
        });
        return includeViewerReactions
          ? (rows as PostListFetchRow[])
          : withEmptyReactions(rows as PostListFetchRow[]);
      }

      if (
        handlers.isUnknownGuestPostColumnError(error) ||
        handlers.isMissingCommunityBoardSchemaError(error) ||
        handlers.isUnsupportedReviewCategoryFilterError(error)
      ) {
        const legacyItems = await prisma.post.findMany({
          ...safeFallbackBaseArgs,
          select: includeViewerReactions
            ? buildLegacyPostListSelect(viewerId)
            : buildLegacyPostListSelectWithoutReactions(),
        });
        return includeViewerReactions
          ? withEmptyGuestPostMeta(legacyItems as PostListFetchRow[])
          : withEmptyReactions(withEmptyGuestPostMeta(legacyItems as PostListFetchRow[]));
      }

      return fetchPostRowsWithoutReactionsWithFallback({
        baseArgs: safeFallbackBaseArgs,
        legacyCompatibleWhere,
        legacyReviewWhere,
        includeGuestAuthor,
        handlers,
      });
    });
}
