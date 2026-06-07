import { describe, expect, it } from "vitest";

import { formatSearchTermCleanupOutput } from "./cleanup-search-terms";

describe("search term cleanup CLI output", () => {
  it("explains dry-run cleanup without implying rows were deleted", () => {
    expect(
      formatSearchTermCleanupOutput({
        mode: "dry-run",
        count: 4,
        cutoff: new Date("2026-01-01T00:00:00.000Z"),
      }),
    ).toBe(
      [
        "Would delete 4 SearchTermStat rows last updated before 2026-01-01T00:00:00.000Z (mode: dry-run).",
        "Dry-run mode. Re-run with --apply to delete rows.",
      ].join("\n"),
    );
  });

  it("formats apply cleanup as a completed deletion", () => {
    expect(
      formatSearchTermCleanupOutput({
        mode: "apply",
        count: 2,
        cutoff: new Date("2026-01-01T00:00:00.000Z"),
      }),
    ).toBe(
      "Deleted 2 SearchTermStat rows last updated before 2026-01-01T00:00:00.000Z (mode: apply).",
    );
  });
});
