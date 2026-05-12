import { PostScope, PostType } from "@prisma/client";

import { createQueryCacheKey, withQueryCache } from "@/server/cache/query-cache";
import { logger, serializeError } from "@/server/logger";
import type { PostSearchIn } from "./post-search-support";

export async function runRankedSearchWithCache<T>({
  scope,
  type,
  query,
  searchIn,
  excludeTypes,
  limit,
  neighborhoodId,
  viewerId,
  hiddenAuthorIds,
  hasDocumentFallback,
  runSearch,
  runFallbackSearch,
}: {
  scope: PostScope;
  type?: PostType;
  query: string;
  searchIn: PostSearchIn;
  excludeTypes: PostType[];
  limit: number;
  neighborhoodId?: string;
  viewerId?: string;
  hiddenAuthorIds: string[];
  hasDocumentFallback: boolean;
  runSearch: () => Promise<T[]>;
  runFallbackSearch: () => Promise<T[]>;
}) {
  const cacheKey = await createQueryCacheKey("search", {
    scope,
    type: type ?? "ALL",
    q: query,
    searchIn,
    excludeTypes,
    limit,
    neighborhoodId: neighborhoodId ?? "",
    viewerId: viewerId ?? "guest",
    hiddenAuthorIds,
    hasChoseongFallback: hasDocumentFallback,
  });

  try {
    return await withQueryCache({
      key: cacheKey,
      ttlSeconds: 45,
      fetcher: runSearch,
    });
  } catch (error) {
    logger.warn("검색 캐시 실패로 원본 검색을 사용합니다.", {
      query,
      searchIn,
      error: serializeError(error),
    });
  }

  try {
    return await runSearch();
  } catch (error) {
    logger.warn("고급 검색 쿼리 실패로 기본 검색으로 fallback합니다.", {
      query,
      searchIn,
      error: serializeError(error),
    });

    return runFallbackSearch();
  }
}
