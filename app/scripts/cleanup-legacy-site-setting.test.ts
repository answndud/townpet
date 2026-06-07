import { describe, expect, it } from "vitest";

import { formatLegacySiteSettingCleanupOutput } from "./cleanup-legacy-site-setting";

describe("legacy SiteSetting cleanup CLI output", () => {
  it("formats empty cleanup results", () => {
    expect(
      formatLegacySiteSettingCleanupOutput({
        mode: "dry-run",
        legacyRows: [],
      }),
    ).toBe("No legacy SiteSetting keys found.");
  });

  it("explains dry-run cleanup without implying keys were deleted", () => {
    expect(
      formatLegacySiteSettingCleanupOutput({
        mode: "dry-run",
        legacyRows: [
          {
            key: "popular_search_terms_v1",
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        ],
      }),
    ).toBe(
      [
        "Found 1 legacy SiteSetting key(s):",
        "- popular_search_terms_v1 (updatedAt=2026-01-01T00:00:00.000Z)",
        "Dry-run mode. Re-run with --apply to delete keys.",
      ].join("\n"),
    );
  });

  it("formats apply cleanup as a completed deletion", () => {
    expect(
      formatLegacySiteSettingCleanupOutput({
        mode: "apply",
        legacyRows: [
          {
            key: "popular_search_terms_v1",
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        ],
        deletedCount: 1,
      }),
    ).toBe(
      [
        "Found 1 legacy SiteSetting key(s):",
        "- popular_search_terms_v1 (updatedAt=2026-01-01T00:00:00.000Z)",
        "Deleted 1 legacy SiteSetting key(s).",
      ].join("\n"),
    );
  });
});
