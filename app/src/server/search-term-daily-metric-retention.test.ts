import { describe, expect, it, vi } from "vitest";

import {
  buildSearchTermDailyMetricRetentionCutoff,
  cleanupSearchTermDailyMetrics,
  resolveSearchTermDailyMetricRetentionDays,
} from "@/server/search-term-daily-metric-retention";

describe("search term daily metric retention", () => {
  it("uses 90 days by default", () => {
    expect(resolveSearchTermDailyMetricRetentionDays(undefined)).toBe(90);
  });

  it("rejects invalid retention values", () => {
    expect(() => resolveSearchTermDailyMetricRetentionDays("0")).toThrow(
      "SEARCH_TERM_DAILY_METRIC_RETENTION_DAYS must be a positive number.",
    );
  });

  it("deletes rows older than the KST day cutoff", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 11 });
    const now = new Date("2026-03-27T15:00:00.000Z");

    const result = await cleanupSearchTermDailyMetrics({
      delegate: { deleteMany },
      retentionDays: 90,
      now,
    });

    expect(buildSearchTermDailyMetricRetentionCutoff(90, now).toISOString()).toBe(
      "2025-12-27T15:00:00.000Z",
    );
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        day: {
          lt: new Date("2025-12-27T15:00:00.000Z"),
        },
      },
    });
    expect(result).toEqual({
      count: 11,
      cutoff: new Date("2025-12-27T15:00:00.000Z"),
    });
  });
});
