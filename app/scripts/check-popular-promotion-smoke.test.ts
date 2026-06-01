import { describe, expect, it } from "vitest";

import {
  assertPopularPromotionSmokeResult,
  formatPopularPromotionSmokeResult,
} from "@/../scripts/check-popular-promotion-smoke";

const baseResult = {
  runId: "popular-smoke-test",
  threshold: 2,
  postId: "post-1",
  postCreatedAt: new Date("2026-04-17T00:00:00.000Z"),
  afterFirstLike: {
    likeCount: 1,
    isPopular: false,
  },
  afterSecondLike: {
    likeCount: 2,
    isPopular: true,
    popularPromotedAt: new Date("2026-06-01T00:00:00.000Z"),
  },
  bestFeedContainsPost: true,
};

describe("popular promotion smoke helpers", () => {
  it("accepts a complete popular promotion smoke result", () => {
    expect(() => assertPopularPromotionSmokeResult(baseResult)).not.toThrow();
  });

  it("rejects promotion before the configured threshold", () => {
    expect(() =>
      assertPopularPromotionSmokeResult({
        ...baseResult,
        afterFirstLike: {
          likeCount: 1,
          isPopular: true,
        },
      }),
    ).toThrow("before reaching the popular threshold");
  });

  it("formats the smoke result for terminal output", () => {
    expect(formatPopularPromotionSmokeResult(baseResult)).toContain(
      "bestFeedContainsPost: true",
    );
  });
});
