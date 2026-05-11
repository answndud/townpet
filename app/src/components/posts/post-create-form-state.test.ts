import { PostScope, PostType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  createInitialPostCreateFormState,
  isDraftFormState,
} from "@/components/posts/post-create-form-state";
import { REVIEW_CATEGORY } from "@/lib/review-category";

describe("post create form state", () => {
  it("creates the canonical initial form state", () => {
    const state = createInitialPostCreateFormState("neighborhood-1");

    expect(state).toMatchObject({
      title: "",
      content: "",
      type: PostType.FREE_BOARD,
      scope: PostScope.GLOBAL,
      neighborhoodId: "neighborhood-1",
      reviewCategory: REVIEW_CATEGORY.SUPPLIES,
      marketListing: {
        listingType: "SELL",
        condition: "GOOD",
      },
      careRequest: {
        careType: "WALK",
        isUrgent: "false",
      },
    });
  });

  it("keeps draft restore limited to complete post form state payloads", () => {
    const state = createInitialPostCreateFormState("");

    expect(isDraftFormState(state)).toBe(true);
    expect(isDraftFormState({ ...state, hospitalReview: undefined })).toBe(false);
    expect(isDraftFormState({ ...state, imageUrls: "not-array" })).toBe(false);
  });
});
