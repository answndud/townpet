import { describe, expect, it } from "vitest";

import {
  buildAudienceSegmentsFromPets,
  buildAudienceSegmentLabel,
  getPetBreedDisplayLabel,
} from "@/lib/pet-profile";

describe("pet-profile personalization helpers", () => {
  it("builds deduplicated audience segments from explicit pet profiles", () => {
    const segments = buildAudienceSegmentsFromPets([
      {
        species: "DOG",
        breedCode: "maltese",
        breedLabel: "말티즈",
        sizeClass: "SMALL",
        lifeStage: "ADULT",
      },
      {
        species: "DOG",
        breedCode: "MALTESE",
        breedLabel: "말티즈",
        sizeClass: "SMALL",
        lifeStage: "ADULT",
      },
      {
        species: "CAT",
        breedCode: "UNKNOWN",
        breedLabel: "",
        sizeClass: "UNKNOWN",
        lifeStage: "UNKNOWN",
      },
    ]);

    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({
      species: "DOG",
      breedCode: "MALTESE",
      sizeClass: "SMALL",
      lifeStage: "ADULT",
      displayLabel: "강아지 · 말티즈 · 소형 · 성체",
      interestTags: expect.arrayContaining([
        "source:pet-profile",
        "signal:explicit-pet",
        "species:DOG",
        "breed:MALTESE",
        "breedLabel:말티즈",
        "size:SMALL",
        "lifeStage:ADULT",
      ]),
    });
    expect(segments[0].confidenceScore).toBeGreaterThan(segments[1].confidenceScore);
    expect(segments[1].displayLabel).toBe("고양이 · 품종 미상");
  });

  it("uses breed label when available and falls back to normalized breed code", () => {
    expect(
      getPetBreedDisplayLabel({
        breedCode: "maltese",
        breedLabel: "말티즈",
      }),
    ).toBe("말티즈");
    expect(
      buildAudienceSegmentLabel({
        species: "DOG",
        breedCode: "korean_shorthair",
        sizeClass: "MEDIUM",
        lifeStage: "YOUNG",
      }),
    ).toBe("강아지 · KOREAN_SHORTHAIR · 중형 · 영유기");
  });
});
