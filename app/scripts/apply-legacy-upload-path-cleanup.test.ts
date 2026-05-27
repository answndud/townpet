import { describe, expect, it } from "vitest";

import {
  formatLegacyUploadPathCleanupApplyReport,
  LEGACY_UPLOAD_PATH_CLEANUP_APPLY_CONFIRM_ENV_KEY,
  LEGACY_UPLOAD_PATH_CLEANUP_APPLY_CONFIRM_VALUE,
} from "./apply-legacy-upload-path-cleanup";

describe("legacy upload path cleanup apply", () => {
  it("uses an explicit production mutation confirmation key", () => {
    expect(LEGACY_UPLOAD_PATH_CLEANUP_APPLY_CONFIRM_ENV_KEY).toBe(
      "LEGACY_UPLOAD_PATH_CLEANUP_APPLY_CONFIRM",
    );
    expect(LEGACY_UPLOAD_PATH_CLEANUP_APPLY_CONFIRM_VALUE).toBe(
      "APPLY_LEGACY_UPLOAD_PATH_CLEANUP",
    );
  });

  it("formats an apply report with update status and verification guidance", () => {
    const report = formatLegacyUploadPathCleanupApplyReport({
      generatedAt: "2026-05-27T00:00:00.000Z",
      mode: "apply",
      pattern: "/media/media/uploads/",
      limit: 50,
      candidateCount: 1,
      plannedCount: 1,
      updatedCount: 1,
      skippedStaleCount: 0,
      items: [
        {
          postId: "post-1",
          title: "이미지 업로드 테스트",
          status: "ACTIVE",
          type: "FREE_BOARD",
          scope: "GLOBAL",
          applyStatus: "UPDATED",
          replacements: [
            {
              before: "/media/media/uploads/legacy.webp",
              after: "/media/uploads/legacy.webp",
              occurrences: 1,
            },
          ],
          beforeSnippet: "![첨부](/media/media/uploads/legacy.webp)",
          afterSnippet: "![첨부](/media/uploads/legacy.webp)",
          updatedContent: "![첨부](/media/uploads/legacy.webp)",
        },
      ],
    });

    expect(report).toContain("# Legacy Upload Path Cleanup Apply");
    expect(report).toContain("- mode: apply");
    expect(report).toContain("- applyStatus: UPDATED");
    expect(report).toContain("- status/type/scope: ACTIVE/FREE_BOARD/GLOBAL");
    expect(report).toContain("/media/media/uploads/legacy.webp -> /media/uploads/legacy.webp");
    expect(report).toContain("Expected remaining count: 0");
  });
});
