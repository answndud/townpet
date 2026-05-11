import { PostScope, PostType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { createInitialPostCreateFormState } from "@/components/posts/post-create-form-state";
import {
  buildPostCreateSubmitPayload,
  createPostCreateSuccessState,
} from "@/components/posts/post-create-submit";
import { REVIEW_CATEGORY } from "@/lib/review-category";

const baseParams = {
  normalizedTitle: "제목",
  serializedContent: "본문",
  serializedImageUrls: ["/media/a.jpg"],
  resolvedScope: PostScope.GLOBAL,
  isAuthenticated: true,
  canUseLocalScope: true,
  showNeighborhood: false,
  showCommunitySelector: true,
  showAnimalTagsInput: false,
  showMarketListing: false,
  showCareRequest: false,
  isFreeBoardType: false,
};

describe("post create submit helpers", () => {
  it("builds a place review payload from product review place category", () => {
    const formState = {
      ...createInitialPostCreateFormState(""),
      type: PostType.PRODUCT_REVIEW,
      reviewCategory: REVIEW_CATEGORY.PLACE,
      petTypeId: "pet-type-1",
      placeReview: {
        ...createInitialPostCreateFormState("").placeReview,
        placeName: "연남동 펫카페",
        isPetAllowed: "true",
      },
    };

    const result = buildPostCreateSubmitPayload({
      ...baseParams,
      formState,
    });

    expect(result).toMatchObject({
      ok: true,
      payload: {
        type: PostType.PLACE_REVIEW,
        reviewCategory: REVIEW_CATEGORY.PLACE,
        placeReview: {
          placeName: "연남동 펫카페",
          isPetAllowed: "true",
        },
      },
    });
  });

  it("normalizes walk route safety tags", () => {
    const formState = {
      ...createInitialPostCreateFormState(""),
      type: PostType.WALK_ROUTE,
      petTypeId: "pet-type-1",
      walkRoute: {
        ...createInitialPostCreateFormState("").walkRoute,
        routeName: "양재천",
        safetyTags: " 차량주의, 야간조명 , ",
      },
    };

    const result = buildPostCreateSubmitPayload({
      ...baseParams,
      formState,
    });

    expect(result).toMatchObject({
      ok: true,
      payload: {
        walkRoute: {
          routeName: "양재천",
          safetyTags: ["차량주의", "야간조명"],
        },
      },
    });
  });

  it("returns a market price validation message before building payload", () => {
    const result = buildPostCreateSubmitPayload({
      ...baseParams,
      formState: {
        ...createInitialPostCreateFormState(""),
        type: PostType.MARKET_LISTING,
      },
      showCommunitySelector: false,
      showMarketListing: true,
    });

    expect(result).toEqual({
      ok: false,
      message: "마켓 글은 가격을 입력해 주세요. 나눔은 0원을 입력합니다.",
    });
  });

  it("keeps the existing success reset behavior stable", () => {
    const state = {
      ...createInitialPostCreateFormState("neighborhood-1"),
      title: "제목",
      content: "본문",
      type: PostType.CARE_REQUEST,
      scope: PostScope.LOCAL,
      petTypeId: "pet-type-1",
      imageUrls: ["/media/a.jpg"],
      guestDisplayName: "손님",
      guestPassword: "1234",
      walkRoute: {
        ...createInitialPostCreateFormState("").walkRoute,
        routeName: "양재천",
        hasStreetLights: "true",
      },
      careRequest: {
        ...createInitialPostCreateFormState("").careRequest,
        startsAt: "2026-05-12T10:00",
      },
    };

    const reset = createPostCreateSuccessState(state);

    expect(reset).toMatchObject({
      title: "",
      content: "",
      type: PostType.FREE_BOARD,
      scope: PostScope.LOCAL,
      neighborhoodId: "neighborhood-1",
      petTypeId: "",
      imageUrls: [],
      guestDisplayName: "",
      guestPassword: "",
      walkRoute: {
        routeName: "",
        hasStreetLights: "true",
      },
      careRequest: {
        startsAt: "2026-05-12T10:00",
      },
    });
  });
});
