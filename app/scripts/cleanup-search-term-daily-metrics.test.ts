import { describe, expect, it } from "vitest";

import { formatSearchTermDailyMetricCleanupOutput } from "./cleanup-search-term-daily-metrics";

describe("search term daily metric cleanup CLI output", () => {
  it("explains dry-run cleanup without implying rows were deleted", () => {
    expect(
      formatSearchTermDailyMetricCleanupOutput({
        mode: "dry-run",
        count: 4,
        cutoff: new Date("2026-01-01T00:00:00.000Z"),
      }),
    ).toBe(
      [
        "Would delete 4 SearchTermDailyMetric rows older than 2026-01-01T00:00:00.000Z (mode: dry-run).",
        "Dry-run mode. Re-run with --apply to delete rows.",
      ].join("\n"),
    );
  });

  it("formats apply cleanup as a completed deletion", () => {
    expect(
      formatSearchTermDailyMetricCleanupOutput({
        mode: "apply",
        count: 2,
        cutoff: new Date("2026-01-01T00:00:00.000Z"),
      }),
    ).toBe(
      "Deleted 2 SearchTermDailyMetric rows older than 2026-01-01T00:00:00.000Z (mode: apply).",
    );
  });
});
