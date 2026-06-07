import { describe, expect, it } from "vitest";

import {
  formatUploadAssetCleanupOutput,
  resolveUploadTempCleanupLimit,
} from "./cleanup-upload-assets";

describe("upload asset cleanup CLI wrapper", () => {
  it("uses the default cleanup limit when not configured", () => {
    expect(resolveUploadTempCleanupLimit(undefined)).toBe(100);
  });

  it("rejects invalid cleanup limits", () => {
    expect(() => resolveUploadTempCleanupLimit("0")).toThrow(
      "UPLOAD_TEMP_CLEANUP_LIMIT must be a positive number.",
    );
    expect(() => resolveUploadTempCleanupLimit("nope")).toThrow(
      "UPLOAD_TEMP_CLEANUP_LIMIT must be a positive number.",
    );
  });

  it("explains dry-run cleanup without implying assets were deleted", () => {
    expect(
      formatUploadAssetCleanupOutput({
        mode: "dry-run",
        retentionHours: 24,
        result: {
          cutoff: new Date("2026-01-01T00:00:00.000Z"),
          scannedCount: 4,
          deletedCount: 2,
          skippedCount: 1,
        },
      }),
    ).toBe(
      [
        "Upload asset cleanup",
        "- mode: dry-run",
        "- retentionHours: 24",
        "- scanned: 4",
        "- wouldDelete: 2",
        "- skipped: 1",
        "- cutoff: 2026-01-01T00:00:00.000Z",
        "Dry-run mode. Re-run with --apply to delete upload assets.",
      ].join("\n"),
    );
  });

  it("formats apply cleanup as completed deletions", () => {
    expect(
      formatUploadAssetCleanupOutput({
        mode: "apply",
        retentionHours: 24,
        result: {
          cutoff: new Date("2026-01-01T00:00:00.000Z"),
          scannedCount: 4,
          deletedCount: 2,
          skippedCount: 1,
        },
      }),
    ).toBe(
      [
        "Upload asset cleanup",
        "- mode: apply",
        "- retentionHours: 24",
        "- scanned: 4",
        "- deleted: 2",
        "- skipped: 1",
        "- cutoff: 2026-01-01T00:00:00.000Z",
      ].join("\n"),
    );
  });
});
