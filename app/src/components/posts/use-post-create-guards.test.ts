import { PostScope, PostType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { postTypeOptions } from "@/components/posts/post-create-form-options";
import { createInitialPostCreateFormState } from "@/components/posts/post-create-form-state";
import {
  getDefaultCommunityPatch,
  getLegacyPlaceReviewPatch,
  getPostTypeAvailabilityPatch,
  getScopeSyncPatch,
} from "@/components/posts/use-post-create-guards";
import { REVIEW_CATEGORY } from "@/lib/review-category";

describe("post create guards", () => {
  it("forces guest scope to global before other availability corrections", () => {
    const formState = {
      ...createInitialPostCreateFormState("neighborhood-1"),
      scope: PostScope.LOCAL,
      type: PostType.ADOPTION_LISTING,
    };

    expect(
      getPostTypeAvailabilityPatch({
        availablePostTypeOptions: postTypeOptions,
        canCreateAdoptionListing: false,
        formState,
        isAuthenticated: false,
      }),
    ).toEqual({ scope: PostScope.GLOBAL });
  });

  it("falls back to free board for unavailable post types", () => {
    const formState = {
      ...createInitialPostCreateFormState(""),
      type: PostType.ADOPTION_LISTING,
    };

    expect(
      getPostTypeAvailabilityPatch({
        availablePostTypeOptions: postTypeOptions,
        canCreateAdoptionListing: false,
        formState,
        isAuthenticated: true,
      }),
    ).toEqual({ type: PostType.FREE_BOARD });
  });

  it("maps legacy place review type to product review place category", () => {
    const formState = {
      ...createInitialPostCreateFormState(""),
      type: PostType.PLACE_REVIEW,
    };

    expect(getLegacyPlaceReviewPatch(formState)).toEqual({
      type: PostType.PRODUCT_REVIEW,
      reviewCategory: REVIEW_CATEGORY.PLACE,
    });
  });

  it("selects the first community for non-free-board posts without pet type", () => {
    const formState = {
      ...createInitialPostCreateFormState(""),
      type: PostType.PRODUCT_REVIEW,
    };

    expect(
      getDefaultCommunityPatch({
        communityOptions: [{ value: "community-1" }, { value: "community-2" }],
        formState,
      }),
    ).toEqual({ petTypeId: "community-1" });
  });

  it("syncs forced scope and clears stale neighborhood outside local scope", () => {
    expect(
      getScopeSyncPatch(
        {
          ...createInitialPostCreateFormState(""),
          type: PostType.CARE_REQUEST,
          scope: PostScope.GLOBAL,
        },
        PostScope.LOCAL,
      ),
    ).toEqual({ scope: PostScope.LOCAL });

    expect(
      getScopeSyncPatch(
        {
          ...createInitialPostCreateFormState("neighborhood-1"),
          type: PostType.HOSPITAL_REVIEW,
          scope: PostScope.GLOBAL,
        },
        PostScope.GLOBAL,
      ),
    ).toEqual({ neighborhoodId: "" });
  });
});
