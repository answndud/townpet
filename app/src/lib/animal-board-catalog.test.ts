import { describe, expect, it } from "vitest";

import {
  ANIMAL_BOARD_CATALOG,
  buildAnimalBoardHref,
  getAnimalBoardByCode,
} from "@/lib/animal-board-catalog";

describe("animal board catalog", () => {
  it("keeps the fixed catalog independent from viewer state", () => {
    expect(ANIMAL_BOARD_CATALOG.length).toBe(12);
    expect(getAnimalBoardByCode("dog")).toMatchObject({ communitySlug: "dogs", label: "강아지" });
    expect(getAnimalBoardByCode("cat")).toMatchObject({ communitySlug: "cats", label: "고양이" });
    expect(getAnimalBoardByCode("unknown")).toBeNull();
  });

  it("builds stable direct links for all and internal boards", () => {
    expect(buildAnimalBoardHref("all")).toBe("/animals/all");
    expect(buildAnimalBoardHref("dog")).toBe("/animals/dog");
    expect(buildAnimalBoardHref("dog", "questions")).toBe("/animals/dog/questions");
  });
});
