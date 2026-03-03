import { describe, expect, it } from "vitest";

import {
  buildNeighborhoodRegionKey,
  getNeighborhoodCityVariants,
  isDisplayableNeighborhoodRegion,
  normalizeNeighborhoodCity,
} from "@/lib/neighborhood-region";

describe("neighborhood region normalization", () => {
  it("normalizes city aliases to canonical names", () => {
    expect(normalizeNeighborhoodCity("서울")).toBe("서울특별시");
    expect(normalizeNeighborhoodCity("부산")).toBe("부산광역시");
    expect(normalizeNeighborhoodCity("성남")).toBe("경기도");
  });

  it("hides branch-office rows from selectable regions", () => {
    expect(normalizeNeighborhoodCity("동해출장소")).toBe("");
    expect(isDisplayableNeighborhoodRegion("서울특별시", "서울특별시")).toBe(false);
    expect(isDisplayableNeighborhoodRegion("서울특별시", "강남구")).toBe(true);
  });

  it("builds canonical region keys and city variants", () => {
    expect(buildNeighborhoodRegionKey("서울", "강남구")).toBe("서울특별시::강남구");
    expect(getNeighborhoodCityVariants("서울특별시")).toContain("서울");
  });
});
