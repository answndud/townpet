import { beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "@/server/logger";
import {
  recordSearchStatisticsWriteMetric,
  resetSearchStatisticsMetricCounter,
} from "@/server/services/search/search-statistics-metrics";

vi.mock("@/server/logger", () => ({
  logger: {
    info: vi.fn(),
  },
}));

describe("search statistics write metrics", () => {
  beforeEach(() => {
    resetSearchStatisticsMetricCounter();
    vi.mocked(logger.info).mockReset();
    vi.stubEnv("SEARCH_STATISTICS_METRIC_SAMPLE_EVERY", "2");
  });

  it("samples context and upsert counts without logging every event", () => {
    const metric = {
      contextCount: 2,
      statUpsertCount: 2,
      dailyMetricUpsertCount: 2,
      resultCount: 0,
      durationMs: 12,
    };

    recordSearchStatisticsWriteMetric(metric);
    expect(logger.info).not.toHaveBeenCalled();

    recordSearchStatisticsWriteMetric(metric);
    expect(logger.info).toHaveBeenCalledWith("search_statistics_write", {
      sampleEvery: 2,
      eventCount: 2,
      ...metric,
    });
  });

  it("falls back to a safe sample interval for invalid configuration", () => {
    vi.stubEnv("SEARCH_STATISTICS_METRIC_SAMPLE_EVERY", "0");
    for (let index = 0; index < 99; index += 1) {
      recordSearchStatisticsWriteMetric({
        contextCount: 1,
        statUpsertCount: 1,
        dailyMetricUpsertCount: 0,
        resultCount: null,
        durationMs: 1,
      });
    }

    expect(logger.info).not.toHaveBeenCalled();
    recordSearchStatisticsWriteMetric({
      contextCount: 1,
      statUpsertCount: 1,
      dailyMetricUpsertCount: 0,
      resultCount: null,
      durationMs: 1,
    });
    expect(logger.info).toHaveBeenCalledOnce();
  });
});
