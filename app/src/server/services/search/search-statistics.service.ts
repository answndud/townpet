import {
  sanitizeSearchTermForStats,
  shouldExcludeSearchTermFromStats,
  type SearchTermSkipReason,
} from "@/lib/search-term-privacy";
import { bumpPopularCacheVersion } from "@/server/cache/query-cache";
import {
  buildSearchTermContexts,
  buildSearchTermDailyMetricKey,
  buildSearchTermStatKey,
  getSearchMetricDayStart,
  isTrackableSearchTerm,
  normalizeResultCount,
  type SearchTermContext,
} from "@/server/queries/search.queries";
import { recordSearchStatisticsWriteMetric } from "@/server/services/search/search-statistics-metrics";
import {
  getSearchTermDailyMetricWriteDelegate,
  getSearchTermStatWriteDelegate,
  isSearchTermStatSchemaSyncError,
  warnMissingSearchTermDailyMetricTable,
  warnMissingSearchTermStatTable,
} from "@/server/services/search/search-statistics.repository";

export type RecordSearchTermOptions = SearchTermContext & {
  resultCount?: number | null;
  incrementQueryCount?: boolean;
};

/**
 * Mutation facade for search telemetry. Routes should depend on this service
 * contract; the query module remains a compatibility export until its legacy
 * implementation is fully extracted.
 */
export type RecordSearchTermResult =
  | { ok: true; recorded: true }
  | { ok: true; recorded: false; reason: SearchTermSkipReason }
  | { ok: false; reason: "SCHEMA_SYNC_REQUIRED" };

export async function recordSearchTerm(
  rawTerm: string,
  options: RecordSearchTermOptions = {},
): Promise<RecordSearchTermResult> {
  const startedAt = Date.now();
  const normalizedTerm = sanitizeSearchTermForStats(rawTerm);
  if (!normalizedTerm) {
    return {
      ok: true,
      recorded: false,
      reason: shouldExcludeSearchTermFromStats(rawTerm) ? "SENSITIVE_TERM" : "INVALID_TERM",
    };
  }

  if (!isTrackableSearchTerm(normalizedTerm)) {
    return { ok: true, recorded: false, reason: "SENSITIVE_TERM" };
  }

  const normalizedKey = normalizedTerm.toLowerCase();
  const resultCount = normalizeResultCount(options.resultCount);
  const incrementQueryCount = options.incrementQueryCount !== false;
  const statsDelegate = getSearchTermStatWriteDelegate();
  const dailyMetricDelegate = getSearchTermDailyMetricWriteDelegate();
  if (!statsDelegate) {
    return { ok: false, reason: "SCHEMA_SYNC_REQUIRED" };
  }

  const contexts = buildSearchTermContexts(options);
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
                  ...(resultCount === 0 ? { zeroResultCount: { increment: 1 } } : {}),
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
    return { ok: false, reason: "SCHEMA_SYNC_REQUIRED" };
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
                    ...(resultCount === 0 ? { zeroResultCount: { increment: 1 } } : {}),
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

  recordSearchStatisticsWriteMetric({
    contextCount: contexts.length,
    statUpsertCount: contexts.length,
    dailyMetricUpsertCount: dailyMetricDelegate ? contexts.length : 0,
    resultCount,
    durationMs: Date.now() - startedAt,
  });

  void bumpPopularCacheVersion().catch(() => undefined);
  return { ok: true, recorded: true };
}
