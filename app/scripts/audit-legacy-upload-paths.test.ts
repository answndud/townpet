import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  LEGACY_DOUBLE_MEDIA_UPLOAD_PATTERN,
  buildCommentContentCandidateWhere,
  buildPostContentCandidateWhere,
  buildPostImageCandidateWhere,
  countLegacyUploadPathOccurrences,
  formatLegacyUploadPathAuditReport,
  normalizeLegacyUploadPathAuditLimit,
} from "./audit-legacy-upload-paths";

describe("legacy upload path audit", () => {
  it("defaults to a bounded read limit", () => {
    expect(normalizeLegacyUploadPathAuditLimit(undefined)).toBe(20);
    expect(normalizeLegacyUploadPathAuditLimit("12")).toBe(12);
  });

  it("rejects unbounded read limits", () => {
    expect(() => normalizeLegacyUploadPathAuditLimit("0")).toThrow("1 to 100");
    expect(() => normalizeLegacyUploadPathAuditLimit("101")).toThrow("1 to 100");
    expect(() => normalizeLegacyUploadPathAuditLimit("not-a-number")).toThrow("1 to 100");
  });

  it("builds read-only candidate filters for content and image fields", () => {
    const expectedFilter = {
      contains: LEGACY_DOUBLE_MEDIA_UPLOAD_PATTERN,
      mode: Prisma.QueryMode.insensitive,
    };

    expect(buildPostContentCandidateWhere()).toEqual({ content: expectedFilter });
    expect(buildPostImageCandidateWhere()).toEqual({ url: expectedFilter });
    expect(buildCommentContentCandidateWhere()).toEqual({ content: expectedFilter });
  });

  it("counts legacy upload path occurrences case-insensitively", () => {
    expect(
      countLegacyUploadPathOccurrences(
        "a /media/media/uploads/one.jpg b /MEDIA/MEDIA/UPLOADS/two.jpg",
      ),
    ).toBe(2);
  });

  it("formats a read-only report with counts and samples", () => {
    const report = formatLegacyUploadPathAuditReport({
      generatedAt: "2026-05-24T00:00:00.000Z",
      mode: "read-only",
      pattern: LEGACY_DOUBLE_MEDIA_UPLOAD_PATTERN,
      limit: 1,
      counts: {
        postContents: 1,
        postImages: 1,
        commentContents: 0,
      },
      samples: {
        postContents: [
          {
            id: "post-1",
            title: "오래된 이미지 경로가 있는 글",
            status: "ACTIVE",
            type: "FREE_BOARD",
            scope: "GLOBAL",
            createdAt: new Date("2026-05-24T00:00:00.000Z"),
            content: "본문 ![](/media/media/uploads/legacy.jpg)",
            _count: { comments: 2, reports: 0 },
          },
        ],
        postImages: [
          {
            id: "image-1",
            postId: "post-1",
            url: "/media/media/uploads/legacy.jpg",
            order: 0,
            post: {
              title: "오래된 이미지 경로가 있는 글",
              status: "ACTIVE",
              type: "FREE_BOARD",
            },
          },
        ],
        commentContents: [],
      },
    });

    expect(report).toContain("# Legacy Upload Path Audit");
    expect(report).toContain("- mode: read-only");
    expect(report).toContain("- postContents: 1");
    expect(report).toContain("- postImages: 1");
    expect(report).toContain("matches=1");
    expect(report).toContain("This report is read-only");
  });
});
