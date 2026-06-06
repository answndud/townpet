import { PostType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  buildBoardListingHref,
  getDedicatedBoardPathByPostType,
  resolveViewerFeedBasePath,
} from "@/lib/community-board";

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
