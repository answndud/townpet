import { describe, expect, it } from "vitest";

import {
  buildFeedSignalContent,
  buildFeedStatsLabel,
  getStableFeedDateLabel,
} from "@/lib/feed-list-presenter";

describe("getStableFeedDateLabel", () => {
  it("formats iso dates with hyphens for non-hydrated mobile feed rows", () => {
    expect(getStableFeedDateLabel("2026-03-07T12:00:00.000Z")).toBe("2026-03-07");
  });

  it("returns empty string for malformed dates", () => {
    expect(getStableFeedDateLabel("not-a-date")).toBe("");
  });
});

describe("buildFeedStatsLabel", () => {
  it("uses stable date labels when relative time has not initialized", () => {
    expect(
      buildFeedStatsLabel({
        createdAt: "2026-03-07T12:00:00.000Z",
        viewCount: 31,
        likeCount: 4,
      }),
    ).toBe("2026-03-07 · 조회 31 · 좋아요 4");
  });

  it("omits invalid date fragments instead of rendering empty separators", () => {
    expect(
      buildFeedStatsLabel({
        createdAt: "bad-date",
        viewCount: 31,
        likeCount: 4,
      }),
    ).toBe("조회 31 · 좋아요 4");
  });

  it("includes comments only when a feed row has replies", () => {
    expect(
      buildFeedStatsLabel({
        createdAt: "2026-03-07T12:00:00.000Z",
        viewCount: 31,
        likeCount: 4,
        commentCount: 2,
      }),
    ).toBe("2026-03-07 · 조회 31 · 좋아요 4 · 댓글 2");
  });
});

describe("buildFeedSignalContent", () => {
  it("keeps short content unchanged", () => {
    expect(buildFeedSignalContent("짧은 본문입니다.")).toBe("짧은 본문입니다.");
  });

  it("trims long non-link content for feed row payloads", () => {
    const result = buildFeedSignalContent("가".repeat(500));

    expect(result.length).toBe(240);
    expect(result).toBe("가".repeat(240));
  });

  it("preserves unique links after the trimmed prefix for signal detection", () => {
    const result = buildFeedSignalContent(
      `${"본문".repeat(150)} https://instagram.com/townpet https://x.com/townpet https://instagram.com/townpet`,
    );

    expect(result.length).toBeLessThan(360);
    expect(result).toContain("https://instagram.com/townpet");
    expect(result).toContain("https://x.com/townpet");
    expect(result.match(/instagram/g)).toHaveLength(1);
  });
});
