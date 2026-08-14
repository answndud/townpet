import { PostType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  buildBoardListingHref,
  COMMON_BOARD_NAV_ITEMS,
  getDedicatedBoardPathByPostType,
  resolveViewerFeedBasePath,
} from "@/lib/community-board";

describe("COMMON_BOARD_NAV_ITEMS", () => {
  it("exposes every common board independently of animal board state", () => {
    expect(COMMON_BOARD_NAV_ITEMS.map((item) => item.label)).toEqual([
      "입양",
      "분실/목격",
      "동물병원 후기",
      "동네 산책코스",
      "동네 모임",
      "중고거래",
      "돌봄",
      "봉사",
    ]);
    expect(COMMON_BOARD_NAV_ITEMS.map((item) => item.href)).toContain("/boards/adoption");
    expect(COMMON_BOARD_NAV_ITEMS.map((item) => item.href)).toContain("/lost-found");
  });
});

describe("getDedicatedBoardPathByPostType", () => {
  it("returns a dedicated board path for adoption listings", () => {
    expect(getDedicatedBoardPathByPostType(PostType.ADOPTION_LISTING)).toBe("/boards/adoption");
  });

  it("returns null for post types without a dedicated board page", () => {
    expect(getDedicatedBoardPathByPostType(PostType.FREE_BOARD)).toBeNull();
  });

  it("builds a dedicated board href when one exists", () => {
    expect(buildBoardListingHref(PostType.ADOPTION_LISTING)).toBe("/boards/adoption");
  });

  it("falls back to the feed listing for post types without a dedicated board", () => {
    expect(buildBoardListingHref(PostType.FREE_BOARD)).toBe("/feed?type=FREE_BOARD&page=1");
  });

  it("can build guest feed listing hrefs without relying on legacy redirects", () => {
    expect(buildBoardListingHref(PostType.FREE_BOARD, { basePath: "/feed/guest" })).toBe(
      "/feed/guest?type=FREE_BOARD&page=1",
    );
    expect(buildBoardListingHref(null, { basePath: "/feed/guest" })).toBe("/feed/guest");
  });

  it("keeps dedicated board hrefs stable when a guest feed base path is provided", () => {
    expect(buildBoardListingHref(PostType.ADOPTION_LISTING, { basePath: "/feed/guest" })).toBe(
      "/boards/adoption",
    );
  });

  it("resolves the canonical feed base path by viewer auth state", () => {
    expect(resolveViewerFeedBasePath(false)).toBe("/feed/guest");
    expect(resolveViewerFeedBasePath(true)).toBe("/feed");
  });
});
