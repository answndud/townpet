import { describe, expect, it } from "vitest";

import {
  assertPopularPromotionSmokeResult,
  formatPopularPromotionSmokeResult,
  runPopularPromotionSmokeCleanup,
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

  it("attempts every cleanup step even when an earlier step fails", async () => {
    const calls: string[] = [];

    await expect(
      runPopularPromotionSmokeCleanup([
        {
          label: "smoke data",
          run: async () => {
            calls.push("smoke data");
            throw new Error("delete failed");
          },
        },
        {
          label: "popular policy",
          run: async () => {
            calls.push("popular policy");
          },
        },
        {
          label: "feed cache",
          run: async () => {
            calls.push("feed cache");
          },
        },
      ]),
    ).rejects.toThrow("Popular promotion smoke cleanup failed: smoke data");

    expect(calls).toEqual(["smoke data", "popular policy", "feed cache"]);
  });

  it("reports all failed cleanup step labels after attempting every step", async () => {
    const calls: string[] = [];

    await expect(
      runPopularPromotionSmokeCleanup([
        {
          label: "smoke data",
          run: async () => {
            calls.push("smoke data");
            throw new Error("delete failed");
          },
        },
        {
          label: "popular policy",
          run: async () => {
            calls.push("popular policy");
            throw new Error("restore failed");
          },
        },
        {
          label: "feed cache",
          run: async () => {
            calls.push("feed cache");
          },
        },
      ]),
    ).rejects.toThrow("Popular promotion smoke cleanup failed: smoke data, popular policy");

    expect(calls).toEqual(["smoke data", "popular policy", "feed cache"]);
  });
});
