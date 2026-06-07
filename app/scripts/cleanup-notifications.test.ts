import { describe, expect, it } from "vitest";

import { formatNotificationCleanupOutput } from "./cleanup-notifications";

describe("notification cleanup CLI output", () => {
  it("explains dry-run cleanup without implying rows were deleted", () => {
    expect(
      formatNotificationCleanupOutput({
        mode: "dry-run",
        count: 3,
        cutoff: new Date("2026-01-01T00:00:00.000Z"),
      }),
    ).toBe(
      [
        "Would delete 3 notifications archived before 2026-01-01T00:00:00.000Z (mode: dry-run).",
        "Dry-run mode. Re-run with --apply to delete rows.",
      ].join("\n"),
    );
  });

  it("formats apply cleanup as a completed deletion", () => {
    expect(
      formatNotificationCleanupOutput({
        mode: "apply",
        count: 1,
        cutoff: new Date("2026-01-01T00:00:00.000Z"),
      }),
    ).toBe("Deleted 1 notifications archived before 2026-01-01T00:00:00.000Z (mode: apply).");
  });
});
