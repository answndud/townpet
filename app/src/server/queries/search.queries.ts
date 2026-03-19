import { prisma } from "@/lib/prisma";
import {
  normalizeSearchTerm,
  shouldExcludeSearchTermFromStats,
  type SearchTermSkipReason,
} from "@/lib/search-term-privacy";
import { logger } from "@/server/logger";
import { bumpPopularCacheVersion, createQueryCacheKey, withQueryCache } from "@/server/cache/query-cache";

type SearchTermStatRecord = {
  termDisplay: string;
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

let missingSearchTermStatDelegateWarned = false;
let missingSearchTermStatTableWarned = false;

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

export type SearchInsightsOverview = {
  popularTerms: SearchTermInsight[];
  zeroResultTerms: SearchTermInsight[];
  lowResultTerms: SearchTermInsight[];
};

type RecordSearchTermOptions = {
  resultCount?: number | null;
  incrementQueryCount?: boolean;
};

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
  const term = normalizeSearchTerm(row.termDisplay);
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

export async function getPopularSearchTerms(limit = 8) {
  const safeLimit = Math.min(Math.max(limit, 1), 20);
  const statsDelegate = getSearchTermStatDelegate();
  if (!statsDelegate) {
    return [] as string[];
  }

  const cacheKey = await createQueryCacheKey("popular", { limit: safeLimit });
  return withQueryCache({
    key: cacheKey,
    ttlSeconds: 300,
    fetcher: async () => {
      let rows: SearchTermStatRecord[];
      try {
        rows = await statsDelegate.findMany({
          take: safeLimit,
          orderBy: [{ count: "desc" }, { updatedAt: "desc" }],
          select: { termDisplay: true },
        });
      } catch (error) {
        if (!isSearchTermStatSchemaSyncError(error)) {
          throw error;
        }
        warnMissingSearchTermStatTable(error);
        return [] as string[];
      }

      return rows
        .map((row) => normalizeSearchTerm(row.termDisplay))
        .filter((term): term is string => Boolean(term))
        .filter((term) => isTrackableSearchTerm(term));
    },
  });
}

export async function listSearchTermSuggestions(rawTerm: string, limit = 5) {
  const normalizedTerm = normalizeSearchTerm(rawTerm);
  if (!normalizedTerm) {
    return [] as string[];
  }

  const statsDelegate = getSearchTermStatDelegate();
  if (!statsDelegate) {
    return [] as string[];
  }

  const safeLimit = Math.min(Math.max(limit, 1), 10);
  const normalizedKey = normalizedTerm.toLowerCase();
  const compactKey = normalizedKey.replace(/\s+/g, "");

  let rows: SearchTermStatRecord[];
  try {
    rows = await statsDelegate.findMany({
      where: {
        OR: [
          { termNormalized: { contains: normalizedKey } },
          { termDisplay: { contains: normalizedTerm, mode: "insensitive" as const } },
        ],
      },
      take: 40,
      orderBy: [{ count: "desc" }, { updatedAt: "desc" }],
      select: {
        termDisplay: true,
        count: true,
        updatedAt: true,
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
      term: normalizeSearchTerm(row.termDisplay),
      count: row.count ?? 0,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.getTime() : 0,
    }))
    .filter(
      (row): row is { term: string; count: number; updatedAt: number } =>
        typeof row.term === "string" && row.term.length > 0,
    )
    .filter((row) => isTrackableSearchTerm(row.term))
    .map((row) => {
      const lowered = row.term.toLowerCase();
      const compact = lowered.replace(/\s+/g, "");
      let matchRank = 3;
      if (lowered.startsWith(normalizedKey)) {
        matchRank = 0;
      } else if (compact.startsWith(compactKey)) {
        matchRank = 1;
      } else if (compact.includes(compactKey) || lowered.includes(normalizedKey)) {
        matchRank = 2;
      }
      return {
        ...row,
        matchRank,
      };
    })
    .filter((row) => row.matchRank < 3)
    .sort((left, right) => {
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

  return Array.from(new Set(scored.map((row) => row.term))).slice(0, safeLimit);
}

export async function getSearchInsightsOverview(limit = 8): Promise<SearchInsightsOverview> {
  const safeLimit = Math.min(Math.max(limit, 1), 20);
  const statsDelegate = getSearchTermStatDelegate();
  if (!statsDelegate) {
    return {
      popularTerms: [],
      zeroResultTerms: [],
      lowResultTerms: [],
    };
  }

  let rows: SearchTermStatRecord[];
  try {
    rows = await statsDelegate.findMany({
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
    return {
      popularTerms: [],
      zeroResultTerms: [],
      lowResultTerms: [],
    };
  }

  const insights = rows
    .map(mapSearchTermInsight)
    .filter((row): row is SearchTermInsight => Boolean(row));

  return {
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
}

export async function recordSearchTerm(rawTerm: string, options: RecordSearchTermOptions = {}) {
  const normalizedTerm = normalizeSearchTerm(rawTerm);
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

  try {
    await statsDelegate.upsert({
      where: { termNormalized: normalizedKey },
      update: {
        termDisplay: normalizedTerm,
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
        termNormalized: normalizedKey,
        termDisplay: normalizedTerm,
        count: 1,
        ...(resultCount !== null
          ? {
              lastResultCount: resultCount,
              totalResultCount: resultCount,
              zeroResultCount: resultCount === 0 ? 1 : 0,
            }
          : {}),
      },
    });
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
