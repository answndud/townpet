import { PostScope, PostType, SearchTermSearchIn } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  buildSearchTermStatVariants,
  normalizeSearchTerm,
  normalizeSearchTermForStats,
  shouldExcludeSearchTermFromStats,
  type SearchTermSkipReason,
} from "@/lib/search-term-privacy";
import { logger } from "@/server/logger";
import { bumpPopularCacheVersion, createQueryCacheKey, withQueryCache } from "@/server/cache/query-cache";

type SearchTermStatRecord = {
  termNormalized?: string;
  termDisplay: string;
  scope?: PostScope;
  typeKey?: string;
  searchIn?: SearchTermSearchIn;
  count?: number;
  zeroResultCount?: number;
  totalResultCount?: number;
  lastResultCount?: number | null;
  updatedAt?: Date;
};

type SearchTermStatDelegate = {
  findMany(args: Record<string, unknown>): Promise<SearchTermStatRecord[]>;
  upsert(args: Record<string, unknown>): Promise<unknown>;
};

export type SearchTermContext = {
  scope?: PostScope | null;
  type?: PostType | null;
  searchIn?: SearchTermSearchIn | "ALL" | "TITLE" | "CONTENT" | "AUTHOR" | null;
};

type NormalizedSearchTermContext = {
  scope: PostScope;
  typeKey: string;
  searchIn: SearchTermSearchIn;
};

type SearchTermContextInput = SearchTermContext | NormalizedSearchTermContext;

type RecordSearchTermOptions = SearchTermContext & {
  resultCount?: number | null;
  incrementQueryCount?: boolean;
};

let missingSearchTermStatDelegateWarned = false;
let missingSearchTermStatTableWarned = false;

const GLOBAL_SEARCH_TERM_CONTEXT: NormalizedSearchTermContext = {
  scope: PostScope.GLOBAL,
  typeKey: "ALL",
  searchIn: SearchTermSearchIn.ALL,
};

function getSearchTermStatDelegate() {
  const delegate = (
    prisma as unknown as { searchTermStat?: SearchTermStatDelegate }
  ).searchTermStat;

  if (!delegate && !missingSearchTermStatDelegateWarned) {
    missingSearchTermStatDelegateWarned = true;
    logger.warn(
      "Prisma Client에 SearchTermStat 모델이 없어 검색 통계를 기록할 수 없습니다.",
    );
  }

  return delegate ?? null;
}

function isSearchTermStatSchemaSyncError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code?: string }).code !== undefined &&
    ((error as { code?: string }).code === "P2021" ||
      (error as { code?: string }).code === "P2022")
  );
}

function warnMissingSearchTermStatTable(error: unknown) {
  if (missingSearchTermStatTableWarned) {
    return;
  }

  missingSearchTermStatTableWarned = true;
  logger.warn("SearchTermStat 테이블/컬럼이 없어 검색 통계를 기록할 수 없습니다.", {
    error: error instanceof Error ? error.message : String(error),
  });
}

export type RecordSearchTermResult =
  | { ok: true; recorded: true }
  | { ok: true; recorded: false; reason: SearchTermSkipReason }
  | { ok: false; reason: "SCHEMA_SYNC_REQUIRED" };

export type SearchTermInsight = {
  term: string;
  count: number;
  zeroResultCount: number;
  averageResultCount: number;
  lastResultCount: number | null;
  updatedAt: string | null;
};

export type SearchInsightsSummary = {
  trackedTermCount: number;
  totalQueryCount: number;
  totalZeroResultCount: number;
  zeroResultRate: number;
};

export type SearchInsightsOverview = {
  context: {
    scope: PostScope;
    typeKey: string;
    searchIn: SearchTermSearchIn;
  };
  summary: SearchInsightsSummary;
  popularTerms: SearchTermInsight[];
  zeroResultTerms: SearchTermInsight[];
  lowResultTerms: SearchTermInsight[];
};

function normalizeSearchIn(
  value: SearchTermContext["searchIn"],
): SearchTermSearchIn {
  if (value === SearchTermSearchIn.TITLE) {
    return SearchTermSearchIn.TITLE;
  }
  if (value === SearchTermSearchIn.CONTENT) {
    return SearchTermSearchIn.CONTENT;
  }
  if (value === SearchTermSearchIn.AUTHOR) {
    return SearchTermSearchIn.AUTHOR;
  }
  return SearchTermSearchIn.ALL;
}

function normalizeSearchTermContext(
  context?: SearchTermContextInput,
): NormalizedSearchTermContext {
  if (context && "typeKey" in context) {
    return {
      scope: context.scope === PostScope.LOCAL ? PostScope.LOCAL : PostScope.GLOBAL,
      typeKey: context.typeKey || "ALL",
      searchIn: normalizeSearchIn(context.searchIn),
    };
  }

  return {
    scope: context?.scope === PostScope.LOCAL ? PostScope.LOCAL : PostScope.GLOBAL,
    typeKey: context?.type ?? "ALL",
    searchIn: normalizeSearchIn(context?.searchIn),
  };
}

function isGlobalSearchTermContext(context: NormalizedSearchTermContext) {
  return (
    context.scope === GLOBAL_SEARCH_TERM_CONTEXT.scope &&
    context.typeKey === GLOBAL_SEARCH_TERM_CONTEXT.typeKey &&
    context.searchIn === GLOBAL_SEARCH_TERM_CONTEXT.searchIn
  );
}

function buildSearchTermStatKey(
  termNormalized: string,
  context: NormalizedSearchTermContext,
) {
  const encodedTerm = Buffer.from(termNormalized, "utf8").toString("hex");
  return `${context.scope}|${context.typeKey}|${context.searchIn}|${encodedTerm}`;
}

function buildSearchTermContextWhere(context: NormalizedSearchTermContext) {
  return {
    scope: context.scope,
    typeKey: context.typeKey,
    searchIn: context.searchIn,
  };
}

function buildSearchTermContexts(context?: SearchTermContextInput) {
  const normalizedContext = normalizeSearchTermContext(context);
  if (isGlobalSearchTermContext(normalizedContext)) {
    return [normalizedContext];
  }

  return [normalizedContext, GLOBAL_SEARCH_TERM_CONTEXT];
}

function matchesSearchTermContext(
  row: SearchTermStatRecord,
  context: NormalizedSearchTermContext,
) {
  return (
    (row.scope ?? PostScope.GLOBAL) === context.scope &&
    (row.typeKey ?? "ALL") === context.typeKey &&
    (row.searchIn ?? SearchTermSearchIn.ALL) === context.searchIn
  );
}

function resolveSearchTermContextRank(
  row: SearchTermStatRecord,
  context: NormalizedSearchTermContext,
) {
  if (matchesSearchTermContext(row, context)) {
    return 0;
  }
  if (matchesSearchTermContext(row, GLOBAL_SEARCH_TERM_CONTEXT)) {
    return 1;
  }
  return 2;
}

function isTrackableSearchTerm(term: string) {
  return !shouldExcludeSearchTermFromStats(term);
}

function normalizeResultCount(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.min(Math.max(Math.floor(value), 0), 500);
}

function mapSearchTermInsight(row: SearchTermStatRecord): SearchTermInsight | null {
  const term = normalizeSearchTermForStats(row.termDisplay);
  if (!term || !isTrackableSearchTerm(term)) {
    return null;
  }

  const count = Math.max(row.count ?? 0, 0);
  const zeroResultCount = Math.max(row.zeroResultCount ?? 0, 0);
  const totalResultCount = Math.max(row.totalResultCount ?? 0, 0);
  const averageResultCount = count > 0 ? totalResultCount / count : 0;

  return {
    term,
    count,
    zeroResultCount,
    averageResultCount,
    lastResultCount: row.lastResultCount ?? null,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : null,
  };
}

function mapSearchTermString(row: SearchTermStatRecord) {
  return normalizeSearchTermForStats(row.termDisplay);
}

function buildEmptySearchInsightsOverview(
  context: NormalizedSearchTermContext = GLOBAL_SEARCH_TERM_CONTEXT,
): SearchInsightsOverview {
  return {
    context,
    summary: {
      trackedTermCount: 0,
      totalQueryCount: 0,
      totalZeroResultCount: 0,
      zeroResultRate: 0,
    },
    popularTerms: [],
    zeroResultTerms: [],
    lowResultTerms: [],
  };
}

function dedupeSearchTerms(
  rows: Array<{
    term: string;
    contextRank: number;
    count: number;
    updatedAt: number;
  }>,
  limit: number,
) {
  const deduped = new Map<string, { term: string }>();

  for (const row of rows) {
    if (!deduped.has(row.term)) {
      deduped.set(row.term, { term: row.term });
    }
    if (deduped.size >= limit) {
      break;
    }
  }

  return Array.from(deduped.values()).map((row) => row.term);
}

function buildTermSearchWhere(variants: string[]) {
  const normalizedVariants = variants
    .map((item) => item.toLowerCase())
    .filter((item, index, items) => items.indexOf(item) === index);

  return {
    OR: [
      ...normalizedVariants.map((item) => ({
        termNormalized: {
          contains: item,
        },
      })),
      ...variants.map((item) => ({
        termDisplay: {
          contains: item,
          mode: "insensitive" as const,
        },
      })),
    ],
  };
}

function resolveMatchRank(term: string, variants: string[]) {
  const lowered = term.toLowerCase();
  const compact = lowered.replace(/\s+/g, "");

  let bestRank = 3;
  for (const variant of variants) {
    const normalizedVariant = variant.toLowerCase();
    const compactVariant = normalizedVariant.replace(/\s+/g, "");
    if (lowered.startsWith(normalizedVariant)) {
      bestRank = Math.min(bestRank, 0);
      continue;
    }
    if (compact.startsWith(compactVariant)) {
      bestRank = Math.min(bestRank, 1);
      continue;
    }
    if (compact.includes(compactVariant) || lowered.includes(normalizedVariant)) {
      bestRank = Math.min(bestRank, 2);
    }
  }

  return bestRank;
}

export async function getPopularSearchTerms(limit = 8, context?: SearchTermContext) {
  const safeLimit = Math.min(Math.max(limit, 1), 20);
  const statsDelegate = getSearchTermStatDelegate();
  if (!statsDelegate) {
    return [] as string[];
  }

  const contexts = buildSearchTermContexts(context);
  const primaryContext = normalizeSearchTermContext(context);
  const cacheKey = await createQueryCacheKey("popular", {
    limit: safeLimit,
    scope: primaryContext.scope,
    typeKey: primaryContext.typeKey,
    searchIn: primaryContext.searchIn,
  });

  return withQueryCache({
    key: cacheKey,
    ttlSeconds: 300,
    fetcher: async () => {
      let rows: SearchTermStatRecord[];
      try {
        rows = await statsDelegate.findMany({
          where: {
            OR: contexts.map(buildSearchTermContextWhere),
          },
          take: Math.max(40, safeLimit * 4),
          orderBy: [{ count: "desc" }, { updatedAt: "desc" }],
          select: {
            termDisplay: true,
            count: true,
            updatedAt: true,
            scope: true,
            typeKey: true,
            searchIn: true,
          },
        });
      } catch (error) {
        if (!isSearchTermStatSchemaSyncError(error)) {
          throw error;
        }
        warnMissingSearchTermStatTable(error);
        return [] as string[];
      }

      const scored = rows
        .map((row) => ({
          term: mapSearchTermString(row),
          count: row.count ?? 0,
          updatedAt: row.updatedAt instanceof Date ? row.updatedAt.getTime() : 0,
          contextRank: resolveSearchTermContextRank(row, primaryContext),
        }))
        .filter(
          (row): row is {
            term: string;
            count: number;
            updatedAt: number;
            contextRank: number;
          } => typeof row.term === "string" && row.term.length > 0,
        )
        .filter((row) => isTrackableSearchTerm(row.term))
        .sort((left, right) => {
          if (left.contextRank !== right.contextRank) {
            return left.contextRank - right.contextRank;
          }
          if (right.count !== left.count) {
            return right.count - left.count;
          }
          if (right.updatedAt !== left.updatedAt) {
            return right.updatedAt - left.updatedAt;
          }
          return left.term.localeCompare(right.term, "ko");
        });

      return dedupeSearchTerms(scored, safeLimit);
    },
  });
}

export async function listSearchTermSuggestions(
  rawTerm: string,
  limit = 5,
  context?: SearchTermContext,
) {
  const normalizedTerm = normalizeSearchTerm(rawTerm);
  if (!normalizedTerm) {
    return [] as string[];
  }

  const statsDelegate = getSearchTermStatDelegate();
  if (!statsDelegate) {
    return [] as string[];
  }

  const safeLimit = Math.min(Math.max(limit, 1), 10);
  const searchVariants = buildSearchTermStatVariants(normalizedTerm);
  const contexts = buildSearchTermContexts(context);
  const primaryContext = normalizeSearchTermContext(context);

  let rows: SearchTermStatRecord[];
  try {
    rows = await statsDelegate.findMany({
      where: {
        AND: [
          { OR: contexts.map(buildSearchTermContextWhere) },
          buildTermSearchWhere(searchVariants),
        ],
      },
      take: 60,
      orderBy: [{ count: "desc" }, { updatedAt: "desc" }],
      select: {
        termDisplay: true,
        count: true,
        updatedAt: true,
        scope: true,
        typeKey: true,
        searchIn: true,
      },
    });
  } catch (error) {
    if (!isSearchTermStatSchemaSyncError(error)) {
      throw error;
    }
    warnMissingSearchTermStatTable(error);
    return [] as string[];
  }

  const scored = rows
    .map((row) => {
      const term = mapSearchTermString(row);
      if (!term) {
        return null;
      }

      return {
        term,
        count: row.count ?? 0,
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.getTime() : 0,
        contextRank: resolveSearchTermContextRank(row, primaryContext),
        matchRank: resolveMatchRank(term, searchVariants),
      };
    })
    .filter(
      (
        row,
      ): row is {
        term: string;
        count: number;
        updatedAt: number;
        contextRank: number;
        matchRank: number;
      } => row !== null,
    )
    .filter((row) => isTrackableSearchTerm(row.term))
    .filter((row) => row.matchRank < 3)
    .sort((left, right) => {
      if (left.contextRank !== right.contextRank) {
        return left.contextRank - right.contextRank;
      }
      if (left.matchRank !== right.matchRank) {
        return left.matchRank - right.matchRank;
      }
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      if (right.updatedAt !== left.updatedAt) {
        return right.updatedAt - left.updatedAt;
      }
      return left.term.localeCompare(right.term, "ko");
    });

  return dedupeSearchTerms(scored, safeLimit);
}

export async function getSearchInsightsOverview(
  limit = 8,
  context?: SearchTermContext,
): Promise<SearchInsightsOverview> {
  const safeLimit = Math.min(Math.max(limit, 1), 20);
  const statsDelegate = getSearchTermStatDelegate();
  const primaryContext = normalizeSearchTermContext(context);
  if (!statsDelegate) {
    return buildEmptySearchInsightsOverview(primaryContext);
  }

  const cacheKey = await createQueryCacheKey("search-insights", {
    limit: safeLimit,
    scope: primaryContext.scope,
    typeKey: primaryContext.typeKey,
    searchIn: primaryContext.searchIn,
  });

  return withQueryCache({
    key: cacheKey,
    ttlSeconds: 300,
    fetcher: async () => {
      let rows: SearchTermStatRecord[];
      try {
        rows = await statsDelegate.findMany({
          where: buildSearchTermContextWhere(primaryContext),
          take: 100,
          orderBy: [{ count: "desc" }, { updatedAt: "desc" }],
          select: {
            termDisplay: true,
            count: true,
            zeroResultCount: true,
            totalResultCount: true,
            lastResultCount: true,
            updatedAt: true,
          },
        });
      } catch (error) {
        if (!isSearchTermStatSchemaSyncError(error)) {
          throw error;
        }
        warnMissingSearchTermStatTable(error);
        return buildEmptySearchInsightsOverview(primaryContext);
      }

      const insights = rows
        .map(mapSearchTermInsight)
        .filter((row): row is SearchTermInsight => Boolean(row));

      const totalQueryCount = insights.reduce((sum, row) => sum + row.count, 0);
      const totalZeroResultCount = insights.reduce((sum, row) => sum + row.zeroResultCount, 0);

      return {
        context: primaryContext,
        summary: {
          trackedTermCount: insights.length,
          totalQueryCount,
          totalZeroResultCount,
          zeroResultRate: totalQueryCount > 0 ? totalZeroResultCount / totalQueryCount : 0,
        },
        popularTerms: insights.slice(0, safeLimit),
        zeroResultTerms: insights
          .filter((row) => row.zeroResultCount > 0)
          .sort((left, right) => {
            if (right.zeroResultCount !== left.zeroResultCount) {
              return right.zeroResultCount - left.zeroResultCount;
            }
            if (right.count !== left.count) {
              return right.count - left.count;
            }
            return left.term.localeCompare(right.term, "ko");
          })
          .slice(0, safeLimit),
        lowResultTerms: insights
          .filter((row) => row.count >= 2 && row.averageResultCount <= 2)
          .sort((left, right) => {
            if (left.averageResultCount !== right.averageResultCount) {
              return left.averageResultCount - right.averageResultCount;
            }
            if (right.count !== left.count) {
              return right.count - left.count;
            }
            return left.term.localeCompare(right.term, "ko");
          })
          .slice(0, safeLimit),
      };
    },
  });
}

export async function recordSearchTerm(rawTerm: string, options: RecordSearchTermOptions = {}) {
  const normalizedTerm = normalizeSearchTermForStats(rawTerm);
  if (!normalizedTerm) {
    return { ok: true, recorded: false, reason: "INVALID_TERM" } as const;
  }

  if (!isTrackableSearchTerm(normalizedTerm)) {
    return { ok: true, recorded: false, reason: "SENSITIVE_TERM" } as const;
  }

  const normalizedKey = normalizedTerm.toLowerCase();
  const resultCount = normalizeResultCount(options.resultCount);
  const incrementQueryCount = options.incrementQueryCount !== false;
  const statsDelegate = getSearchTermStatDelegate();
  if (!statsDelegate) {
    return { ok: false, reason: "SCHEMA_SYNC_REQUIRED" } as const;
  }

  const primaryContext = normalizeSearchTermContext(options);
  const contexts = buildSearchTermContexts(primaryContext);

  try {
    await Promise.all(
      contexts.map((context) =>
        statsDelegate.upsert({
          where: { statKey: buildSearchTermStatKey(normalizedKey, context) },
          update: {
            termNormalized: normalizedKey,
            termDisplay: normalizedTerm,
            scope: context.scope,
            typeKey: context.typeKey,
            searchIn: context.searchIn,
            ...(incrementQueryCount ? { count: { increment: 1 } } : {}),
            ...(resultCount !== null
              ? {
                  lastResultCount: resultCount,
                  totalResultCount: { increment: resultCount },
                  ...(resultCount === 0
                    ? {
                        zeroResultCount: { increment: 1 },
                      }
                    : {}),
                }
              : {}),
          },
          create: {
            statKey: buildSearchTermStatKey(normalizedKey, context),
            termNormalized: normalizedKey,
            termDisplay: normalizedTerm,
            scope: context.scope,
            typeKey: context.typeKey,
            searchIn: context.searchIn,
            count: incrementQueryCount ? 1 : 0,
            ...(resultCount !== null
              ? {
                  lastResultCount: resultCount,
                  totalResultCount: resultCount,
                  zeroResultCount: resultCount === 0 ? 1 : 0,
                }
              : {}),
          },
        }),
      ),
    );
  } catch (error) {
    if (!isSearchTermStatSchemaSyncError(error)) {
      throw error;
    }
    warnMissingSearchTermStatTable(error);
    return { ok: false, reason: "SCHEMA_SYNC_REQUIRED" } as const;
  }

  void bumpPopularCacheVersion().catch(() => undefined);

  return { ok: true, recorded: true } as const;
}
