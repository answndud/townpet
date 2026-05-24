import { describe, expect, it } from "vitest";

import {
  buildCommentCandidateWhere,
  buildPostCandidateWhere,
  buildUserCandidateWhere,
  formatDemoContentAuditReport,
  normalizeAuditLimit,
} from "./audit-demo-content-candidates";

describe("demo content candidate audit", () => {
  it("defaults to a bounded read limit", () => {
    expect(normalizeAuditLimit(undefined)).toBe(20);
    expect(normalizeAuditLimit("7")).toBe(7);
  });

  it("rejects unbounded read limits", () => {
    expect(() => normalizeAuditLimit("0")).toThrow("1 to 100");
    expect(() => normalizeAuditLimit("101")).toThrow("1 to 100");
    expect(() => normalizeAuditLimit("not-a-number")).toThrow("1 to 100");
  });

  it("includes owned demo email domain when building user candidates", () => {
    const where = buildUserCandidateWhere({
      signals: ["E2E"],
      emailDomain: "demo.townpet.co.kr",
    });

    expect(where).toEqual({
      OR: [
        { email: { contains: "E2E", mode: "insensitive" } },
        { nickname: { contains: "E2E", mode: "insensitive" } },
        { email: { endsWith: "@demo.townpet.co.kr", mode: "insensitive" } },
      ],
    });
  });

  it("checks post, author, and guest author signals", () => {
    const where = buildPostCandidateWhere({ signals: ["playwright"] });

    expect(where.OR).toEqual(
      expect.arrayContaining([
        { title: { contains: "playwright", mode: "insensitive" } },
        { content: { contains: "playwright", mode: "insensitive" } },
        { structuredSearchText: { contains: "playwright", mode: "insensitive" } },
        {
          guestAuthor: {
            OR: [{ displayName: { contains: "playwright", mode: "insensitive" } }],
          },
        },
      ]),
    );
  });

  it("checks comment, author, and guest author signals", () => {
    const where = buildCommentCandidateWhere({ signals: ["visual-smoke"] });

    expect(where.OR).toEqual(
      expect.arrayContaining([
        { content: { contains: "visual-smoke", mode: "insensitive" } },
        {
          guestAuthor: {
            OR: [{ displayName: { contains: "visual-smoke", mode: "insensitive" } }],
          },
        },
      ]),
    );
  });

  it("formats a read-only report with counts and samples", () => {
    const report = formatDemoContentAuditReport({
      generatedAt: "2026-05-24T00:00:00.000Z",
      mode: "read-only",
      limit: 1,
      emailDomain: "demo.townpet.co.kr",
      signals: ["E2E"],
      counts: {
        users: 1,
        posts: 1,
        comments: 0,
      },
      samples: {
        users: [
          {
            id: "user-1",
            email: "sample@demo.townpet.co.kr",
            nickname: "샘플·작성자",
            createdAt: new Date("2026-05-24T00:00:00.000Z"),
            _count: { posts: 1, comments: 0 },
          },
        ],
        posts: [
          {
            id: "post-1",
            title: "[샘플 안내] 테스트 글",
            status: "ACTIVE",
            type: "FREE_BOARD",
            scope: "GLOBAL",
            createdAt: new Date("2026-05-24T00:00:00.000Z"),
            author: {
              email: "sample@demo.townpet.co.kr",
              nickname: "샘플·작성자",
            },
            _count: { comments: 0, reports: 0 },
          },
        ],
        comments: [],
      },
    });

    expect(report).toContain("- mode: read-only");
    expect(report).toContain("- users: 1");
    expect(report).toContain("sample@demo.townpet.co.kr");
    expect(report).toContain("This report is read-only");
  });
});
