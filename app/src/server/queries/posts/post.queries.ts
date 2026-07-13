import {
  PostScope,
  PostStatus,
  PostType,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { buildVisibleAuthorFilter } from "@/lib/sanction-visibility";
import {
  expandExcludedPostTypes,
} from "@/lib/post-type-groups";
import { logger, serializeError } from "@/server/logger";
import { listHiddenAuthorIdsForViewer } from "@/server/queries/user-relation.queries";
import { createQueryCacheKey, withQueryCache } from "@/server/cache/query-cache";
import { fetchPostDetailWithFallback } from "./post-detail-fetch-fallback";
import {
  buildRankedSearchCandidateSql,
  buildRankedSearchMatchSql,
  buildRankedSearchWhereSql,
  buildStructuredSearchSqlVariants,
  resolveRankedSearchCandidateLimit,
  shouldTryPostSearchDocumentFallback,
  type RankedSearchRow,
} from "./post-ranked-search-support";
import { runRankedSearchWithCache } from "./post-ranked-search-cache";
import { listRankedSearchDocumentFallbackCandidateIds } from "./post-ranked-search-document-fallback";
import { hydrateRankedSearchPostsByIds } from "./post-ranked-search-hydration";
import {
  isPostTypeFullyExcluded,
} from "./post-list-where-support";
import {
  countBestPostsWithDependencies,
  countPostsWithDependencies,
  listBestPostsWithDependencies,
  listPostsWithDependencies,
  type BestPostCountOptions,
  type BestPostListOptions,
  type PostCountOptions,
  type PostListOptions,
} from "./post-list.queries";
import { getPostDetailWidgetById } from "./post-detail-widget.queries";
import {
  DEFAULT_POST_SEARCH_IN,
  type PostSearchIn,
} from "./post-search-support";
import {
  markPostReactionsUnsupported,
  supportsPostReactionsField,
} from "./post-engagement-support";
import { applyPetPersonalization } from "./post-feed-personalization.queries";
import {
  isMissingCommunityBoardSchemaError,
  isUnknownGuestAuthorIncludeError,
  isUnknownGuestPostColumnError,
  isUnsupportedReviewCategoryFilterError,
} from "./post-query-schema-support";
export {
  listCareApplicationsForPostDetail,
  listCareCompletionFeedbacksForPostDetail,
} from "./post-detail-care.queries";
export type {
  CareApplicationDetailItem,
  CareCompletionFeedbackDetailItem,
} from "./post-detail-read-model";
export type { PostSearchIn } from "./post-search-support";
export type { PostListSort } from "./post-list-args";
export {
  listPostSearchSuggestions,
} from "./post-search-suggestions.queries";
export { findViewerPostReaction } from "./post-reaction.queries";
export {
  listViewerRecentBehaviorSummaryLabels,
  listViewerRecentBookmarkSummaryLabels,
  listViewerRecentDwellSummaryLabels,
  listViewerRecentEngagementSummaryLabels,
} from "./post-feed-personalization.queries";
export {
  countUserBookmarkedPosts,
  countUserPosts,
  listUserBookmarkedPostsPage,
  listUserPosts,
  listUserPostsPage,
} from "./post-user-posts.queries";

const NO_VIEWER_ID = "__NO_VIEWER__";
let postGuestAuthorFieldSupport: boolean | null = null;
let postReviewCategoryFieldSupport: boolean | null = null;
let pgTrgmSupport: boolean | null = null;
let pgTrgmSupportWarned = false;

async function supportsPgTrgm() {
  if (pgTrgmSupport !== null) {
    return pgTrgmSupport;
  }

  try {
    const result = await prisma.$queryRaw<Array<{ enabled: boolean }>>(Prisma.sql`
      SELECT EXISTS(
        SELECT 1
        FROM pg_extension
        WHERE extname = 'pg_trgm'
      ) AS enabled
    `);
    pgTrgmSupport = Boolean(result[0]?.enabled);
  } catch (error) {
    pgTrgmSupport = false;
    if (!pgTrgmSupportWarned) {
      pgTrgmSupportWarned = true;
      logger.warn("pg_trgm 확장 지원 여부 확인에 실패해 trigram 검색을 비활성화합니다.", {
        error: serializeError(error),
      });
    }
  }

  if (!pgTrgmSupport && !pgTrgmSupportWarned) {
    pgTrgmSupportWarned = true;
    logger.warn(
      "pg_trgm 확장이 설치되지 않아 trigram 유사도 검색을 비활성화합니다. 마이그레이션으로 확장을 적용해 주세요.",
    );
  }

  return pgTrgmSupport;
}

const postListFetchFallbackHandlers = {
  isUnknownGuestPostColumnError,
  isUnknownGuestAuthorIncludeError,
  isMissingCommunityBoardSchemaError,
  isUnsupportedReviewCategoryFilterError,
  onUnsupportedReviewCategoryFilter: () => {
    postReviewCategoryFieldSupport = false;
  },
};

const postDetailFetchFallbackHandlers = {
  isUnknownGuestPostColumnError,
  isUnknownGuestAuthorIncludeError,
  onUnavailableReactions: markPostReactionsUnsupported,
};

function countPostRowsWithSchemaFallback({
  where,
  legacyWhere,
}: {
  where: Prisma.PostWhereInput;
  legacyWhere: Prisma.PostWhereInput;
}) {
  return prisma.post.count({ where }).catch((error) => {
    if (!isMissingCommunityBoardSchemaError(error) && !isUnsupportedReviewCategoryFilterError(error)) {
      throw error;
    }

    if (isUnsupportedReviewCategoryFilterError(error)) {
      postReviewCategoryFieldSupport = false;
    }

    return prisma.post.count({ where: legacyWhere });
  });
}

function supportsPostGuestAuthorField() {
  if (postGuestAuthorFieldSupport !== null) {
    return postGuestAuthorFieldSupport;
  }

  postGuestAuthorFieldSupport = true;
  return true;
}

function supportsPostReviewCategoryField() {
  if (postReviewCategoryFieldSupport !== null) {
    return postReviewCategoryFieldSupport;
  }

  postReviewCategoryFieldSupport = true;
  return true;
}

export async function getPostById(id?: string, viewerId?: string) {
  if (!id) {
    return null;
  }
  const shouldCache = !viewerId;
  const runGetPost = async () => {
    const hiddenAuthorIds = await listHiddenAuthorIdsForViewer(viewerId);
    const visibilityFilter: Prisma.PostWhereInput = {
      ...(hiddenAuthorIds.length > 0 ? { authorId: { notIn: hiddenAuthorIds } } : {}),
      author: buildVisibleAuthorFilter(),
    };

    return fetchPostDetailWithFallback({
      id,
      visibilityFilter,
      viewerId,
      includeReactions: supportsPostReactionsField(),
      includeGuestAuthor: supportsPostGuestAuthorField(),
      handlers: postDetailFetchFallbackHandlers,
    });
  };

  if (shouldCache) {
    const cacheKey = await createQueryCacheKey("post-detail", { id });
    return withQueryCache({
      key: cacheKey,
      ttlSeconds: 30,
      fetcher: runGetPost,
      cacheNull: false,
    });
  }

  return runGetPost();
}

export async function getPostMetadataById(id?: string, viewerId?: string) {
  return getPostDetailWidgetById({
    id,
    viewerId,
    mode: "meta",
    ttlSeconds: 30,
    select: {
      id: true,
      type: true,
      scope: true,
      status: true,
      title: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      images: {
        select: { url: true },
        orderBy: { order: "asc" },
        take: 1,
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

export async function getPostStatsById(id?: string, viewerId?: string) {
  return getPostDetailWidgetById({
    id,
    viewerId,
    mode: "stats",
    ttlSeconds: 60,
    select: {
      id: true,
      authorId: true,
      type: true,
      scope: true,
      status: true,
      neighborhoodId: true,
      likeCount: true,
      dislikeCount: true,
      commentCount: true,
      viewCount: true,
    },
  });
}

export async function getPostReadAccessById(id?: string, viewerId?: string) {
  return getPostDetailWidgetById({
    id,
    viewerId,
    mode: "read-access",
    ttlSeconds: 60,
    select: {
      id: true,
      type: true,
      scope: true,
      status: true,
      neighborhoodId: true,
    },
  });
}

export async function getPostContentById(id?: string, viewerId?: string) {
  return getPostDetailWidgetById({
    id,
    viewerId,
    mode: "content",
    ttlSeconds: 60,
    select: {
      id: true,
      type: true,
      scope: true,
      status: true,
      content: true,
    },
  });
}

function getPostListQueryDependencies() {
  return {
    noViewerId: NO_VIEWER_ID,
    postListFetchFallbackHandlers,
    supportsPostGuestAuthorField,
    supportsPostReviewCategoryField,
    countPostRowsWithSchemaFallback,
    applyPetPersonalization,
  };
}

export async function listPosts(options: PostListOptions) {
  return listPostsWithDependencies(options, getPostListQueryDependencies());
}

export async function listBestPosts(options: BestPostListOptions) {
  return listBestPostsWithDependencies(options, getPostListQueryDependencies());
}

export async function listAdminPopularPosts({ limit = 10 }: { limit?: number } = {}) {
  return prisma.post.findMany({
    where: {
      status: PostStatus.ACTIVE,
      isPopular: true,
      popularPromotedAt: { not: null },
    },
    orderBy: [
      { popularPromotedAt: "desc" },
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: Math.min(Math.max(limit, 1), 20),
    select: {
      id: true,
      title: true,
      type: true,
      scope: true,
      likeCount: true,
      commentCount: true,
      viewCount: true,
      popularPromotedAt: true,
      createdAt: true,
      author: {
        select: {
          email: true,
          nickname: true,
        },
      },
      guestAuthor: {
        select: {
          displayName: true,
        },
      },
    },
  });
}

export async function countPosts(options: PostCountOptions) {
  return countPostsWithDependencies(options, getPostListQueryDependencies());
}

export async function countBestPosts(options: BestPostCountOptions) {
  return countBestPostsWithDependencies(options, getPostListQueryDependencies());
}

type RankedPostSearchOptions = {
  limit: number;
  type?: PostType;
  scope: PostScope;
  q?: string;
  searchIn?: PostSearchIn;
  excludeTypes?: PostType[];
  neighborhoodId?: string;
  viewerId?: string;
};

export async function listRankedSearchPosts({
  limit,
  type,
  scope,
  q,
  searchIn,
  excludeTypes,
  neighborhoodId,
  viewerId,
}: RankedPostSearchOptions) {
  const hiddenAuthorIds = await listHiddenAuthorIdsForViewer(viewerId);
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const trimmedQuery = q?.trim();
  if (!trimmedQuery) {
    return [];
  }

  const normalizedExcludeTypes = expandExcludedPostTypes(excludeTypes ?? []);
  if (isPostTypeFullyExcluded(type, normalizedExcludeTypes)) {
    return [];
  }

  const resolvedSearchIn = searchIn ?? DEFAULT_POST_SEARCH_IN;
  const includeStructuredSearch = resolvedSearchIn === "ALL";
  const shouldTryDocumentFallback = shouldTryPostSearchDocumentFallback(trimmedQuery);
  const likePattern = `%${trimmedQuery}%`;
  const compactQuery = trimmedQuery.replace(/\s+/g, "");
  const compactPattern = `%${compactQuery}%`;
  const useTrigram = await supportsPgTrgm();
  const structuredSearchVariants = includeStructuredSearch
    ? buildStructuredSearchSqlVariants(trimmedQuery)
    : [];
  const searchMatchSql = buildRankedSearchMatchSql(
    resolvedSearchIn,
    trimmedQuery,
    likePattern,
    compactPattern,
    useTrigram,
    structuredSearchVariants,
  );
  const whereSql = buildRankedSearchWhereSql({
    scope,
    type,
    excludeTypes: normalizedExcludeTypes,
    neighborhoodId,
    hiddenAuthorIds,
    searchSql: searchMatchSql,
  });
  const candidateLimit = resolveRankedSearchCandidateLimit({
    query: trimmedQuery,
    safeLimit,
  });
  const includeViewerReactions = Boolean(viewerId);
  const hydratePostsByIds = (candidateIds: string[]) =>
    hydrateRankedSearchPostsByIds({
      candidateIds,
      hiddenAuthorIds,
      safeLimit,
      includeViewerReactions,
      viewerId,
      includeGuestAuthor: supportsPostGuestAuthorField(),
      noViewerId: NO_VIEWER_ID,
      isUnknownGuestAuthorIncludeError,
    });
  const runRankedSearch = async () => {
    const candidates = await prisma.$queryRaw<RankedSearchRow[]>(
      buildRankedSearchCandidateSql({
        whereSql,
        query: trimmedQuery,
        likePattern,
        compactPattern,
        useTrigram,
        includeStructuredSearch,
        structuredSearchVariants,
        candidateLimit,
      }),
    );

    const candidateIds = Array.from(
      new Set(
        candidates
          .map((item) => item.id)
          .filter((value): value is string => typeof value === "string"),
      ),
    );
    return hydratePostsByIds(candidateIds);
  };

  const runSearchDocumentFallback = async () => {
    const candidateIds = await listRankedSearchDocumentFallbackCandidateIds({
      type,
      excludeTypes: normalizedExcludeTypes,
      scope,
      neighborhoodId,
      hiddenAuthorIds,
      query: trimmedQuery,
      searchIn: resolvedSearchIn,
      safeLimit,
    });

    return hydratePostsByIds(candidateIds);
  };

  const runSearch = async () => {
    const rankedItems = await runRankedSearch();
    if (rankedItems.length > 0 || !shouldTryDocumentFallback) {
      return rankedItems;
    }

    return runSearchDocumentFallback();
  };

  return runRankedSearchWithCache({
    scope,
    type,
    query: trimmedQuery,
    searchIn: resolvedSearchIn,
    excludeTypes: normalizedExcludeTypes,
    limit: safeLimit,
    neighborhoodId,
    viewerId,
    hiddenAuthorIds,
    hasDocumentFallback: shouldTryDocumentFallback,
    runSearch,
    runFallbackSearch: async () => {
      const fallback = await listPosts({
        limit: Math.min(Math.max(safeLimit * 3, safeLimit), 80),
        type,
        scope,
        q: trimmedQuery,
        searchIn: resolvedSearchIn,
        excludeTypes: normalizedExcludeTypes,
        neighborhoodId,
        viewerId,
      });
      return fallback.items.slice(0, safeLimit);
    },
  });
}
