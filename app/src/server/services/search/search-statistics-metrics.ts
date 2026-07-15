import { logger } from "@/server/logger";

type SearchStatisticsWriteMetric = {
  contextCount: number;
  statUpsertCount: number;
  dailyMetricUpsertCount: number;
  resultCount: number | null;
  durationMs: number;
};

let eventCount = 0;

function resolveSampleEvery() {
  const configured = Number(process.env.SEARCH_STATISTICS_METRIC_SAMPLE_EVERY ?? "100");
  return Number.isInteger(configured) && configured > 0 ? configured : 100;
}

export function recordSearchStatisticsWriteMetric(metric: SearchStatisticsWriteMetric) {
  eventCount += 1;
  if (eventCount % resolveSampleEvery() !== 0) {
    return;
  }

  logger.info("search_statistics_write", {
    sampleEvery: resolveSampleEvery(),
    eventCount,
    ...metric,
  });
}

export function resetSearchStatisticsMetricCounter() {
  eventCount = 0;
}
