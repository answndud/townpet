import { PostScope, PostType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  applyPostCreateTemplateToFormState,
  createInitialPostCreateFormState,
  isDraftFormState,
} from "@/components/posts/post-create-form-state";
import { getPostCreateTemplateById } from "@/lib/post-create-templates";
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
      lostFound: {
        alertType: "LOST",
        petType: "",
        breed: "",
        lastSeenAt: "",
        lastSeenLocation: "",
      },
    });
  });

  it("keeps draft restore limited to complete post form state payloads", () => {
    const state = createInitialPostCreateFormState("");

    expect(isDraftFormState(state)).toBe(true);
    expect(isDraftFormState({ ...state, hospitalReview: undefined })).toBe(false);
    expect(isDraftFormState({ ...state, lostFound: undefined })).toBe(false);
    expect(isDraftFormState({ ...state, imageUrls: "not-array" })).toBe(false);
  });

  it("applies writing template copy and structured defaults together", () => {
    const state = createInitialPostCreateFormState("");
    const template = getPostCreateTemplateById("walk_route_large_dog", "서울 강남구");

    expect(template).not.toBeNull();

    const nextState = applyPostCreateTemplateToFormState(state, template!);

    expect(nextState).toMatchObject({
      type: PostType.WALK_ROUTE,
      title: "서울 강남구 산책코스 제보해요",
      animalTagsInput: "강아지",
      walkRoute: {
        difficulty: "EASY",
        largeDogFriendly: "true",
        crowdedTime: "주말 오후",
        leashRequiredNote: "목줄 필수",
      },
    });
    expect(nextState.content).toContain("시작/끝 지점");
    expect(nextState.content).toContain("주의할 위험 구간");
  });
});
