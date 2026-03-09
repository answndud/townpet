import { describe, expect, it } from "vitest";

import { shouldStripFeedPageParam } from "@/lib/feed";

describe("shouldStripFeedPageParam", () => {
  it("keeps page values above 1", () => {
    expect(shouldStripFeedPageParam({ page: "2" })).toBe(false);
  });

  it("strips page=1", () => {
    expect(shouldStripFeedPageParam({ page: "1" })).toBe(true);
  });

  it("keeps later pages for the default feed", () => {
    expect(shouldStripFeedPageParam({ page: "3" })).toBe(false);
  });

  it("strips invalid page values", () => {
    expect(shouldStripFeedPageParam({ page: "abc" })).toBe(true);
  });
});
