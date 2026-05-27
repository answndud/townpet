import { describe, expect, it } from "vitest";

import {
  buildLegacyUploadPathReplacementPlan,
  buildLegacyUploadPathCleanupPreview,
  formatLegacyUploadPathCleanupDryRunReport,
  normalizeLegacyUploadPathCleanupLimit,
} from "./dry-run-legacy-upload-path-cleanup";

const basePost = {
  id: "post-1",
  title: "이미지 업로드 테스트",
  status: "ACTIVE",
  type: "FREE_BOARD",
  scope: "GLOBAL",
};

describe("legacy upload path cleanup dry-run", () => {
  it("defaults to a bounded read limit", () => {
    expect(normalizeLegacyUploadPathCleanupLimit(undefined)).toBe(20);
    expect(normalizeLegacyUploadPathCleanupLimit("50")).toBe(50);
  });

  it("rejects unbounded dry-run limits", () => {
    expect(() => normalizeLegacyUploadPathCleanupLimit("0")).toThrow("1 to 100");
    expect(() => normalizeLegacyUploadPathCleanupLimit("101")).toThrow("1 to 100");
    expect(() => normalizeLegacyUploadPathCleanupLimit("nan")).toThrow("1 to 100");
  });

  it("previews canonical replacement without mutating content", () => {
    const content = [
      "본문",
      "![첨부](/media/media/uploads/legacy.webp)",
      "다시 ![첨부](/media/media/uploads/legacy.webp)",
    ].join("\n");
    const preview = buildLegacyUploadPathCleanupPreview({
      ...basePost,
      content,
    });

    expect(preview).toMatchObject({
      postId: "post-1",
      replacements: [
        {
          before: "/media/media/uploads/legacy.webp",
          after: "/media/uploads/legacy.webp",
          occurrences: 2,
        },
      ],
    });
    expect(preview?.beforeSnippet).toContain("/media/media/uploads/legacy.webp");
    expect(preview?.afterSnippet).toContain("/media/uploads/legacy.webp");
    expect(content).toContain("/media/media/uploads/legacy.webp");
  });

  it("builds the updated content used by apply scripts", () => {
    const plan = buildLegacyUploadPathReplacementPlan(
      "![첨부](/media/media/uploads/legacy.webp)",
    );

    expect(plan?.updatedContent).toBe("![첨부](/media/uploads/legacy.webp)");
    expect(plan?.replacements).toEqual([
      {
        before: "/media/media/uploads/legacy.webp",
        after: "/media/uploads/legacy.webp",
        occurrences: 1,
      },
    ]);
  });

  it("ignores rows that cannot be converted to a trusted upload proxy path", () => {
    const preview = buildLegacyUploadPathCleanupPreview({
      ...basePost,
      content: "본문 /media/media/not-uploads/legacy.webp",
    });

    expect(preview).toBeNull();
  });

  it("formats a dry-run report with before and after paths", () => {
    const report = formatLegacyUploadPathCleanupDryRunReport({
      generatedAt: "2026-05-27T00:00:00.000Z",
      mode: "dry-run",
      pattern: "/media/media/uploads/",
      limit: 50,
      candidateCount: 1,
      changedCount: 1,
      previews: [
        {
          postId: "post-1",
          title: "이미지 업로드 테스트",
          status: "ACTIVE",
          type: "FREE_BOARD",
          scope: "GLOBAL",
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

    expect(report).toContain("# Legacy Upload Path Cleanup Dry Run");
    expect(report).toContain("- mode: dry-run");
    expect(report).toContain("/media/media/uploads/legacy.webp -> /media/uploads/legacy.webp");
    expect(report).toContain("No production data was changed");
  });
});
