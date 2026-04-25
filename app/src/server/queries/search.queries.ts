import { PostScope, PostType, SearchTermSearchIn } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  buildSearchDocumentParts,
  hasChoseongSearchSignal,
  matchesSearchDocumentQuery,
  resolveSearchDocumentMatchRank,
} from "@/lib/search-document";
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

type SearchTermDailyMetricRecord = {
  day?: Date;
  queryCount?: number;
  zeroResultCount?: number;
  totalResultCount?: number;
};

type SearchTermDailyMetricDelegate = {
  findMany(args: Record<string, unknown>): Promise<SearchTermDailyMetricRecord[]>;
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
let missingSearchTermDailyMetricDelegateWarned = false;
let missingSearchTermDailyMetricTableWarned = false;

const SEARCH_DAILY_METRIC_DEFAULT_DAYS = 7;
const SEARCH_DAILY_METRIC_MAX_DAYS = 14;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

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

function getSearchTermDailyMetricDelegate() {
  const delegate = (
    prisma as unknown as { searchTermDailyMetric?: SearchTermDailyMetricDelegate }
  ).searchTermDailyMetric;

  if (!delegate && !missingSearchTermDailyMetricDelegateWarned) {
    missingSearchTermDailyMetricDelegateWarned = true;
    logger.warn(
      "Prisma Client에 SearchTermDailyMetric 모델이 없어 검색 일일 통계를 기록할 수 없습니다.",
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

function warnMissingSearchTermDailyMetricTable(error: unknown) {
  if (missingSearchTermDailyMetricTableWarned) {
    return;
  }

  missingSearchTermDailyMetricTableWarned = true;
  logger.warn("SearchTermDailyMetric 테이블/컬럼이 없어 검색 일일 통계를 기록할 수 없습니다.", {
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
  zeroResultRate: number;
  averageResultCount: number;
  lastResultCount: number | null;
  updatedAt: string | null;
  action: {
    priority: "high" | "medium" | "low";
    label: string;
    description: string;
  };
};

export type SearchInsightsSummary = {
  trackedTermCount: number;
  totalQueryCount: number;
  totalZeroResultCount: number;
  zeroResultRate: number;
};

export type SearchInsightsDailyMetric = {
  date: string;
  queryCount: number;
  zeroResultCount: number;
  totalResultCount: number;
  averageResultCount: number;
  zeroResultRate: number;
};

export type SearchInsightsOverview = {
  context: {
    scope: PostScope;
    typeKey: string;
    searchIn: SearchTermSearchIn;
  };
  summary: SearchInsightsSummary;
  dailyMetrics: SearchInsightsDailyMetric[];
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

function getSearchMetricDayStart(date = new Date()) {
  const kstDay = Math.floor((date.getTime() + KST_OFFSET_MS) / DAY_MS);
  return new Date(kstDay * DAY_MS - KST_OFFSET_MS);
}

function formatSearchMetricDate(date: Date) {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

function buildSearchTermDailyMetricKey(
  day: Date,
  context: NormalizedSearchTermContext,
) {
  return `${formatSearchMetricDate(day)}|${context.scope}|${context.typeKey}|${context.searchIn}`;
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
  const zeroResultRate = count > 0 ? zeroResultCount / count : 0;
  const lastResultCount = row.lastResultCount ?? null;

  return {
    term,
    count,
    zeroResultCount,
    zeroResultRate,
    averageResultCount,
    lastResultCount,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : null,
    action: buildSearchTermOperationalAction({
      count,
      zeroResultCount,
      zeroResultRate,
      averageResultCount,
      lastResultCount,
    }),
  };
}

function buildSearchTermOperationalAction({
  count,
  zeroResultCount,
  zeroResultRate,
  averageResultCount,
  lastResultCount,
}: {
  count: number;
  zeroResultCount: number;
  zeroResultRate: number;
  averageResultCount: number;
  lastResultCount: number | null;
}): SearchTermInsight["action"] {
  if (
    zeroResultCount >= 3 ||
    (count >= 5 && zeroResultRate >= 0.4) ||
    (count >= 3 && lastResultCount === 0)
  ) {
    return {
      priority: "high",
      label: "콘텐츠/동의어 보강",
      description: "반복 실패 검색입니다. 기존 게시글 제목/태그 보강 또는 seed 콘텐츠 후보로 올립니다.",
    };
  }

  if (zeroResultCount > 0 || averageResultCount <= 1) {
    return {
      priority: "medium",
      label: "검색어 매핑 점검",
      description: "결과가 부족합니다. 띄어쓰기, 초성, 유사어 매칭 후보로 분류합니다.",
    };
  }

  return {
    priority: "low",
    label: "추이 관찰",
    description: "충분한 반복 신호가 쌓일 때까지 주간 검색 품질 점검에서 관찰합니다.",
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
    dailyMetrics: [],
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

function buildSearchInsightDailyMetrics(
  rows: SearchTermDailyMetricRecord[],
  days: number,
): SearchInsightsDailyMetric[] {
  const safeDays = Math.min(Math.max(days, 1), SEARCH_DAILY_METRIC_MAX_DAYS);
  const today = getSearchMetricDayStart(new Date());
  const rowByDate = new Map(
    rows
      .filter((row): row is SearchTermDailyMetricRecord & { day: Date } => row.day instanceof Date)
      .map((row) => [formatSearchMetricDate(row.day), row]),
  );

  return Array.from({ length: safeDays }, (_, index) => {
    const day = new Date(today.getTime() - (safeDays - index - 1) * DAY_MS);
    const date = formatSearchMetricDate(day);
    const row = rowByDate.get(date);
    const queryCount = Math.max(row?.queryCount ?? 0, 0);
    const zeroResultCount = Math.max(row?.zeroResultCount ?? 0, 0);
    const totalResultCount = Math.max(row?.totalResultCount ?? 0, 0);

    return {
      date,
      queryCount,
      zeroResultCount,
      totalResultCount,
      averageResultCount: queryCount > 0 ? totalResultCount / queryCount : 0,
      zeroResultRate: queryCount > 0 ? zeroResultCount / queryCount : 0,
    };
  });
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
  const queryDocument = buildSearchDocumentParts(normalizedTerm);
  const shouldTryDocumentFallback =
    hasChoseongSearchSignal(normalizedTerm) ||
    (!normalizedTerm.includes(" ") && queryDocument.compactText.length >= 3);
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

  const fallbackRows =
    rows.length === 0 && shouldTryDocumentFallback
      ? await statsDelegate
          .findMany({
            where: {
              OR: contexts.map(buildSearchTermContextWhere),
            },
            take: 80,
            orderBy: [{ count: "desc" }, { updatedAt: "desc" }],
            select: {
              termDisplay: true,
              count: true,
              updatedAt: true,
              scope: true,
              typeKey: true,
              searchIn: true,
            },
          })
          .catch((error) => {
            if (!isSearchTermStatSchemaSyncError(error)) {
              throw error;
            }
            warnMissingSearchTermStatTable(error);
            return [] as SearchTermStatRecord[];
          })
      : [];

  const candidateRows = rows.length > 0 ? rows : fallbackRows;

  const scored = candidateRows
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
        matchRank: resolveSearchDocumentMatchRank(term, queryDocument),
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
    .filter((row) => matchesSearchDocumentQuery(row.term, queryDocument))
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
  days = SEARCH_DAILY_METRIC_DEFAULT_DAYS,
): Promise<SearchInsightsOverview> {
  const safeLimit = Math.min(Math.max(limit, 1), 20);
  const safeDays = Math.min(Math.max(days, 1), SEARCH_DAILY_METRIC_MAX_DAYS);
  const statsDelegate = getSearchTermStatDelegate();
  const dailyMetricDelegate = getSearchTermDailyMetricDelegate();
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

      let dailyRows: SearchTermDailyMetricRecord[] = [];
      if (dailyMetricDelegate) {
        try {
          const startDay = getSearchMetricDayStart(
            new Date(Date.now() - (safeDays - 1) * DAY_MS),
          );
          dailyRows = await dailyMetricDelegate.findMany({
            where: {
              ...buildSearchTermContextWhere(primaryContext),
              day: { gte: startDay },
            },
            orderBy: [{ day: "asc" }],
            take: safeDays,
            select: {
              day: true,
              queryCount: true,
              zeroResultCount: true,
              totalResultCount: true,
            },
          });
        } catch (error) {
          if (!isSearchTermStatSchemaSyncError(error)) {
            throw error;
          }
          warnMissingSearchTermDailyMetricTable(error);
        }
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
        dailyMetrics: buildSearchInsightDailyMetrics(dailyRows, safeDays),
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
  const dailyMetricDelegate = getSearchTermDailyMetricDelegate();
  if (!statsDelegate) {
    return { ok: false, reason: "SCHEMA_SYNC_REQUIRED" } as const;
  }

  const primaryContext = normalizeSearchTermContext(options);
  const contexts = buildSearchTermContexts(primaryContext);
  const metricDay = getSearchMetricDayStart(new Date());

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

  if (dailyMetricDelegate) {
    try {
      await Promise.all(
        contexts.map((context) =>
          dailyMetricDelegate.upsert({
            where: { metricKey: buildSearchTermDailyMetricKey(metricDay, context) },
            update: {
              day: metricDay,
              scope: context.scope,
              typeKey: context.typeKey,
              searchIn: context.searchIn,
              ...(incrementQueryCount ? { queryCount: { increment: 1 } } : {}),
              ...(resultCount !== null
                ? {
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
              metricKey: buildSearchTermDailyMetricKey(metricDay, context),
              day: metricDay,
              scope: context.scope,
              typeKey: context.typeKey,
              searchIn: context.searchIn,
              queryCount: incrementQueryCount ? 1 : 0,
              totalResultCount: resultCount ?? 0,
              zeroResultCount: resultCount === 0 ? 1 : 0,
            },
          }),
        ),
      );
    } catch (error) {
      if (!isSearchTermStatSchemaSyncError(error)) {
        throw error;
      }
      warnMissingSearchTermDailyMetricTable(error);
    }
  }

  void bumpPopularCacheVersion().catch(() => undefined);

  return { ok: true, recorded: true } as const;
}
