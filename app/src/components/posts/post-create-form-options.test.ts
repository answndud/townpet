import { PostScope, PostType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  careTypeOptions,
  marketConditionOptions,
  marketListingTypeOptions,
  postTypeOptions,
  resolveScopeByPostType,
  reviewCategoryOptions,
} from "@/components/posts/post-create-form-options";
import { REVIEW_CATEGORY } from "@/lib/review-category";

describe("post create form options", () => {
  it("keeps key option sets available to the write form", () => {
    expect(postTypeOptions.map((option) => option.value)).toContain(PostType.FREE_BOARD);
    expect(postTypeOptions.map((option) => option.value)).toContain(PostType.WALK_ROUTE);
    expect(reviewCategoryOptions.map((option) => option.value)).toContain(REVIEW_CATEGORY.PLACE);
    expect(marketListingTypeOptions.map((option) => option.value)).toEqual([
      "SELL",
      "RENT",
      "SHARE",
    ]);
    expect(marketConditionOptions.map((option) => option.value)).toContain("GOOD");
    expect(careTypeOptions.map((option) => option.value)).toContain("WALK");
  });

  it("resolves forced scopes by post type", () => {
    expect(resolveScopeByPostType(PostType.HOSPITAL_REVIEW, PostScope.LOCAL)).toBe(
      PostScope.GLOBAL,
    );
    expect(resolveScopeByPostType(PostType.CARE_REQUEST, PostScope.GLOBAL)).toBe(
      PostScope.LOCAL,
    );
    expect(resolveScopeByPostType(PostType.WALK_ROUTE, PostScope.GLOBAL)).toBe(
      PostScope.LOCAL,
    );
    expect(resolveScopeByPostType(PostType.FREE_BOARD, PostScope.LOCAL)).toBe(
      PostScope.LOCAL,
    );
  });
});
