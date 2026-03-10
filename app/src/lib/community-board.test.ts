import { PostType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  buildBoardListingHref,
  getDedicatedBoardPathByPostType,
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
});
