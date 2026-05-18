import { describe, expect, it, vi } from "vitest";

import {
  buildSearchTermRetentionCutoff,
  cleanupSearchTermStats,
  resolveSearchTermRetentionDays,
} from "@/server/search-term-stat-retention";

describe("search term stat retention", () => {
  it("uses 90 days by default", () => {
    expect(resolveSearchTermRetentionDays(undefined)).toBe(90);
  });

  it("rejects invalid retention values", () => {
    expect(() => resolveSearchTermRetentionDays("0")).toThrow(
      "SEARCH_TERM_RETENTION_DAYS must be a positive number.",
    );
  });

  it("deletes rows older than the cutoff", async () => {
    const count = vi.fn().mockResolvedValue(7);
    const deleteMany = vi.fn().mockResolvedValue({ count: 7 });
    const now = new Date("2026-03-07T00:00:00.000Z");

    const result = await cleanupSearchTermStats({
      delegate: { count, deleteMany },
      retentionDays: 90,
      now,
    });

    expect(buildSearchTermRetentionCutoff(90, now).toISOString()).toBe(
      "2025-12-07T00:00:00.000Z",
    );
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        updatedAt: {
          lt: new Date("2025-12-07T00:00:00.000Z"),
        },
      },
    });
    expect(result).toEqual({
      count: 7,
      cutoff: new Date("2025-12-07T00:00:00.000Z"),
    });
  });

  it("counts rows without deleting in dry-run mode", async () => {
    const count = vi.fn().mockResolvedValue(4);
    const deleteMany = vi.fn();
    const now = new Date("2026-03-07T00:00:00.000Z");

    const result = await cleanupSearchTermStats({
      delegate: { count, deleteMany },
      retentionDays: 90,
      now,
      dryRun: true,
    });

    expect(count).toHaveBeenCalledWith({
      where: {
        updatedAt: {
          lt: new Date("2025-12-07T00:00:00.000Z"),
        },
      },
    });
    expect(deleteMany).not.toHaveBeenCalled();
    expect(result.count).toBe(4);
  });
});
