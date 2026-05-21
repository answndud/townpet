import { describe, expect, it } from "vitest";

import { buildPostStructuredSearchText } from "@/lib/post-structured-search";

describe("buildPostStructuredSearchText", () => {
  it("flattens structured post fields into a single normalized search document", () => {
    expect(
      buildPostStructuredSearchText({
        animalTags: ["강아지", "  산책  "],
        hospitalReview: {
          hospitalName: "  해피 동물 병원 ",
          treatmentType: "중성화 수술",
        },
        adoptionListing: {
          shelterName: " 서울 보호 센터 ",
          region: "서울 서초",
          breed: "웰시 코기",
        },
        marketListing: {
          listingType: "SELL",
          condition: "LIKE_NEW",
          rentalPeriod: "2주 대여",
        },
        lostFound: {
          petType: "고양이",
          breed: "치즈태비",
          lastSeenLocation: "서초구 반포동",
        },
      }),
    ).toBe(
      "강아지 산책 해피 동물 병원 중성화 수술 서울 보호 센터 서울 서초 웰시 코기 SELL LIKE_NEW 2주 대여 고양이 치즈태비 서초구 반포동",
    );
  });

  it("returns an empty string when there is no structured content", () => {
    expect(buildPostStructuredSearchText({})).toBe("");
  });
});
