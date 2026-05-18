import { PostScope, PostType, Prisma } from "@prisma/client";

import { FEED_PAGE_SIZE } from "@/lib/feed";
import { expandExcludedPostTypes } from "@/lib/post-type-groups";
import type { ReviewCategory } from "@/lib/review-category";
import { createQueryCacheKey, withQueryCache } from "@/server/cache/query-cache";
import { listHiddenAuthorIdsForViewer } from "@/server/queries/user-relation.queries";
import {
  attachBookmarkStateToPosts,
  supportsPostReactionsField,
} from "./post-engagement-support";
import {
  buildBestPostListFindManyBaseArgs,
  buildPostListFindManyBaseArgs,
  buildPostListOrderBy,
  DEFAULT_POST_LIST_SORT,
  type PostListSort,
} from "./post-list-args";
import {
  fetchPostRowsWithReactionsWithFallback,
  fetchPostRowsWithoutReactionsWithFallback,
  type PostListFetchFallbackHandlers,
} from "./post-list-fetch-fallback";
import { fetchRankedPostListSearchDocumentFallback } from "./post-list-search-document-fallback";
import {
  buildBestPostCountWherePair,
  buildBestPostListWhereSet,
  buildPostCountWherePair,
  buildPostListWhereSet,
  isPostTypeFullyExcluded,
} from "./post-list-where-support";
import {
  shouldTryPostSearchDocumentFallback,
} from "./post-ranked-search-support";
import {
  DEFAULT_POST_SEARCH_IN,
  type PostSearchIn,
} from "./post-search-support";

export type PostListOptions = {
  cursor?: string;
  limit: number;
  page?: number;
  type?: PostType;
  reviewBoard?: boolean;
  reviewCategory?: ReviewCategory;
  scope: PostScope;
  petTypeId?: string;
  petTypeIds?: string[];
  q?: string;
  searchIn?: PostSearchIn;
  sort?: PostListSort;
  days?: number;
  excludeTypes?: PostType[];
  neighborhoodId?: string;
  viewerId?: string;
  personalized?: boolean;
  authorBreedCode?: string;
};

export type BestPostListOptions = {
  limit: number;
  page?: number;
  days: number;
  type?: PostType;
  reviewBoard?: boolean;
  reviewCategory?: ReviewCategory;
  scope: PostScope;
  petTypeId?: string;
  petTypeIds?: string[];
  q?: string;
  searchIn?: PostSearchIn;
  excludeTypes?: PostType[];
  neighborhoodId?: string;
  minLikes?: number;
  viewerId?: string;
};

export type PostCountOptions = {
  type?: PostType;
  reviewBoard?: boolean;
  reviewCategory?: ReviewCategory;
  scope: PostScope;
  petTypeId?: string;
  petTypeIds?: string[];
  q?: string;
  searchIn?: PostSearchIn;
  days?: number;
  excludeTypes?: PostType[];
  neighborhoodId?: string;
  viewerId?: string;
  authorBreedCode?: string;
};

export type BestPostCountOptions = {
  days: number;
  type?: PostType;
  reviewBoard?: boolean;
  reviewCategory?: ReviewCategory;
  scope: PostScope;
  petTypeId?: string;
  petTypeIds?: string[];
  q?: string;
  searchIn?: PostSearchIn;
  excludeTypes?: PostType[];
  neighborhoodId?: string;
  minLikes?: number;
  viewerId?: string;
};

export type FeedLikePost = {
  id: string;
  createdAt: Date;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  petTypeId?: string | null;
  type?: PostType;
  reviewCategory?: ReviewCategory | null;
  animalTags?: string[];
  petType?: {
    tags?: string[] | null;
  } | null;
  author: {
    id: string;
  };
};

type PostListQueryDependencies = {
  noViewerId: string;
  postListFetchFallbackHandlers: PostListFetchFallbackHandlers;
  supportsPostGuestAuthorField: () => boolean;
  supportsPostReviewCategoryField: () => boolean;
  countPostRowsWithSchemaFallback: (params: {
    where: Prisma.PostWhereInput;
    legacyWhere: Prisma.PostWhereInput;
  }) => Promise<number>;
  applyPetPersonalization: <T extends FeedLikePost>(items: T[], viewerId: string) => Promise<T[]>;
};

function normalizeBreedCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

export async function listPostsWithDependencies(
  {
    cursor,
    limit: _limit,
    page,
    type,
    reviewBoard,
    reviewCategory,
    scope,
    petTypeId,
    petTypeIds,
    q,
    searchIn,
    sort,
    days,
    excludeTypes,
    neighborhoodId,
    viewerId,
    personalized,
    authorBreedCode,
  }: PostListOptions,
  dependencies: PostListQueryDependencies,
) {
  const resolvedLimit = Math.min(Math.max(_limit, 1), FEED_PAGE_SIZE);
  const resolvedPage = Math.max(page ?? 1, 1);
  const hiddenAuthorIds = await listHiddenAuthorIdsForViewer(viewerId);
  const normalizedExcludeTypes = expandExcludedPostTypes(excludeTypes ?? []);
  if (isPostTypeFullyExcluded(type, normalizedExcludeTypes)) {
    return { items: [], nextCursor: null };
  }

  const runListPosts = async () => {
    const includeViewerReactions = Boolean(viewerId);
    const resolvedSearchIn = searchIn ?? DEFAULT_POST_SEARCH_IN;
    const resolvedSort = sort ?? DEFAULT_POST_LIST_SORT;
    const whereSet = buildPostListWhereSet({
      type,
      reviewBoard,
      reviewCategory,
      reviewCategorySupported: dependencies.supportsPostReviewCategoryField(),
      scope,
      petTypeId,
      petTypeIds,
      q,
      searchIn: resolvedSearchIn,
      excludeTypes: normalizedExcludeTypes,
      neighborhoodId,
      hiddenAuthorIds,
      days,
      authorBreedCode,
    });
    const orderBy = buildPostListOrderBy(resolvedSort);
    const baseArgs = buildPostListFindManyBaseArgs({
      where: whereSet.where,
      limit: resolvedLimit,
      page: resolvedPage,
      cursor,
      orderBy,
    });

    if (!supportsPostReactionsField()) {
      const items = await fetchPostRowsWithoutReactionsWithFallback({
        baseArgs,
        legacyCompatibleWhere: whereSet.legacyCompatibleWhere,
        legacyReviewWhere: whereSet.legacyReviewWhere,
        includeGuestAuthor: dependencies.supportsPostGuestAuthorField(),
        handlers: dependencies.postListFetchFallbackHandlers,
      });
      let nextCursor: string | null = null;
      if (items.length > resolvedLimit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id ?? null;
      }

      return { items, nextCursor };
    }

    let items = await fetchPostRowsWithReactionsWithFallback({
      baseArgs,
      legacyCompatibleWhere: whereSet.legacyCompatibleWhere,
      legacyReviewWhere: whereSet.legacyReviewWhere,
      includeViewerReactions,
      viewerId,
      includeGuestAuthor: dependencies.supportsPostGuestAuthorField(),
      noViewerId: dependencies.noViewerId,
      handlers: dependencies.postListFetchFallbackHandlers,
    });

    const trimmedQuery = q?.trim();
    if (
      items.length === 0 &&
      trimmedQuery &&
      !cursor &&
      resolvedPage === 1 &&
      shouldTryPostSearchDocumentFallback(trimmedQuery)
    ) {
      items = await fetchRankedPostListSearchDocumentFallback({
        where: whereSet.searchDocumentFallbackWhere,
        take: Math.min(Math.max(resolvedLimit * 12, 60), 180),
        orderBy,
        includeViewerReactions,
        viewerId,
        includeGuestAuthor: dependencies.supportsPostGuestAuthorField(),
        noViewerId: dependencies.noViewerId,
        query: trimmedQuery,
        searchIn: resolvedSearchIn,
        limit: resolvedLimit + 1,
      });
    }

    let nextCursor: string | null = null;
    if (items.length > resolvedLimit) {
      const nextItem = items.pop();
      nextCursor = nextItem?.id ?? null;
    }

    if (personalized && viewerId) {
      const personalizedItems = (await dependencies.applyPetPersonalization(
        items as Array<FeedLikePost & (typeof items)[number]>,
        viewerId,
      )) as typeof items;
      return {
        items: (await attachBookmarkStateToPosts(
          personalizedItems as Array<{ id: string }>,
          viewerId,
        )) as unknown as typeof personalizedItems,
        nextCursor,
      };
    }

    return {
      items: (await attachBookmarkStateToPosts(
        items as Array<{ id: string }>,
        viewerId,
      )) as unknown as typeof items,
      nextCursor,
    };
  };

  const normalizedAuthorBreedCode = normalizeBreedCode(authorBreedCode);
  const shouldCache = !personalized && !cursor && resolvedPage === 1;

  if (shouldCache) {
    const cacheKey = await createQueryCacheKey("feed", {
      scope,
      type: type ?? "ALL",
      reviewBoard: reviewBoard ? "1" : "0",
      reviewCategory: reviewCategory ?? "ALL",
      petTypeId: petTypeId ?? "ALL",
      petTypeIds: petTypeIds?.join(",") ?? "",
      q: q?.trim() ?? "",
      searchIn: searchIn ?? DEFAULT_POST_SEARCH_IN,
      sort: sort ?? DEFAULT_POST_LIST_SORT,
      days: days ?? "",
      excludeTypes: normalizedExcludeTypes,
      limit: resolvedLimit,
      page: resolvedPage,
      authorBreedCode: normalizedAuthorBreedCode ?? "",
      neighborhoodId: neighborhoodId ?? "",
      viewerId: viewerId ?? "guest",
      hiddenAuthorIds,
    });
    return withQueryCache({
      key: cacheKey,
      ttlSeconds: 30,
      fetcher: runListPosts,
    });
  }

  return runListPosts();
}

export async function listBestPostsWithDependencies(
  {
    limit: _limit,
    page,
    days,
    type,
    reviewBoard,
    reviewCategory,
    scope,
    petTypeId,
    petTypeIds,
    q,
    searchIn,
    excludeTypes,
    neighborhoodId,
    minLikes = 1,
    viewerId,
  }: BestPostListOptions,
  dependencies: PostListQueryDependencies,
) {
  const resolvedLimit = Math.min(Math.max(_limit, 1), FEED_PAGE_SIZE);
  const resolvedPage = Math.max(page ?? 1, 1);
  const hiddenAuthorIds = await listHiddenAuthorIdsForViewer(viewerId);
  const normalizedExcludeTypes = expandExcludedPostTypes(excludeTypes ?? []);
  if (isPostTypeFullyExcluded(type, normalizedExcludeTypes)) {
    return [];
  }

  const runListBestPosts = async () => {
    const includeViewerReactions = Boolean(viewerId);
    const resolvedSearchIn = searchIn ?? DEFAULT_POST_SEARCH_IN;
    const whereSet = buildBestPostListWhereSet({
      days,
      minLikes,
      type,
      reviewBoard,
      reviewCategory,
      reviewCategorySupported: dependencies.supportsPostReviewCategoryField(),
      scope,
      petTypeId,
      petTypeIds,
      q,
      searchIn: resolvedSearchIn,
      excludeTypes: normalizedExcludeTypes,
      neighborhoodId,
      hiddenAuthorIds,
    });

    const baseArgs = buildBestPostListFindManyBaseArgs({
      where: whereSet.where,
      limit: resolvedLimit,
      page: resolvedPage,
    });

    if (!supportsPostReactionsField()) {
      return fetchPostRowsWithoutReactionsWithFallback({
        baseArgs,
        legacyCompatibleWhere: whereSet.legacyCompatibleWhere,
        legacyReviewWhere: whereSet.legacyReviewWhere,
        includeGuestAuthor: dependencies.supportsPostGuestAuthorField(),
        handlers: dependencies.postListFetchFallbackHandlers,
      });
    }

    const items = await fetchPostRowsWithReactionsWithFallback({
      baseArgs,
      legacyCompatibleWhere: whereSet.legacyCompatibleWhere,
      legacyReviewWhere: whereSet.legacyReviewWhere,
      includeViewerReactions,
      viewerId,
      includeGuestAuthor: dependencies.supportsPostGuestAuthorField(),
      noViewerId: dependencies.noViewerId,
      handlers: dependencies.postListFetchFallbackHandlers,
    });
    return (await attachBookmarkStateToPosts(
      items as Array<{ id: string }>,
      viewerId,
    )) as unknown as typeof items;
  };

  const cacheKey = await createQueryCacheKey("feed", {
    scope,
    type: type ?? "ALL",
    reviewBoard: reviewBoard ? "1" : "0",
    reviewCategory: reviewCategory ?? "ALL",
    petTypeId: petTypeId ?? "ALL",
    petTypeIds: petTypeIds?.join(",") ?? "",
    q: q?.trim() ?? "",
    searchIn: searchIn ?? DEFAULT_POST_SEARCH_IN,
    days,
    excludeTypes: normalizedExcludeTypes,
    limit: resolvedLimit,
    page: resolvedPage,
    minLikes,
    neighborhoodId: neighborhoodId ?? "",
    viewerId: viewerId ?? "guest",
    hiddenAuthorIds,
  });
  return withQueryCache({
    key: cacheKey,
    ttlSeconds: 30,
    fetcher: runListBestPosts,
  });
}

export async function countPostsWithDependencies(
  {
    type,
    reviewBoard,
    reviewCategory,
    scope,
    petTypeId,
    petTypeIds,
    q,
    searchIn,
    days,
    excludeTypes,
    neighborhoodId,
    viewerId,
    authorBreedCode,
  }: PostCountOptions,
  dependencies: PostListQueryDependencies,
) {
  const hiddenAuthorIds = await listHiddenAuthorIdsForViewer(viewerId);
  const normalizedExcludeTypes = expandExcludedPostTypes(excludeTypes ?? []);
  if (isPostTypeFullyExcluded(type, normalizedExcludeTypes)) {
    return 0;
  }

  const resolvedSearchIn = searchIn ?? DEFAULT_POST_SEARCH_IN;
  const countWhere = buildPostCountWherePair({
    type,
    reviewBoard,
    reviewCategory,
    reviewCategorySupported: dependencies.supportsPostReviewCategoryField(),
    scope,
    petTypeId,
    petTypeIds,
    q,
    searchIn: resolvedSearchIn,
    excludeTypes: normalizedExcludeTypes,
    neighborhoodId,
    hiddenAuthorIds,
    days,
    authorBreedCode,
  });

  return dependencies.countPostRowsWithSchemaFallback({
    where: countWhere.where,
    legacyWhere: countWhere.legacyWhere,
  });
}

export async function countBestPostsWithDependencies(
  {
    days,
    type,
    reviewBoard,
    reviewCategory,
    scope,
    petTypeId,
    petTypeIds,
    q,
    searchIn,
    excludeTypes,
    neighborhoodId,
    minLikes = 1,
    viewerId,
  }: BestPostCountOptions,
  dependencies: PostListQueryDependencies,
) {
  const hiddenAuthorIds = await listHiddenAuthorIdsForViewer(viewerId);
  const normalizedExcludeTypes = expandExcludedPostTypes(excludeTypes ?? []);
  if (isPostTypeFullyExcluded(type, normalizedExcludeTypes)) {
    return 0;
  }

  const resolvedSearchIn = searchIn ?? DEFAULT_POST_SEARCH_IN;
  const countWhere = buildBestPostCountWherePair({
    days,
    minLikes,
    type,
    reviewBoard,
    reviewCategory,
    reviewCategorySupported: dependencies.supportsPostReviewCategoryField(),
    scope,
    petTypeId,
    petTypeIds,
    q,
    searchIn: resolvedSearchIn,
    excludeTypes: normalizedExcludeTypes,
    neighborhoodId,
    hiddenAuthorIds,
  });

  return dependencies.countPostRowsWithSchemaFallback({
    where: countWhere.where,
    legacyWhere: countWhere.legacyWhere,
  });
}
