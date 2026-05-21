import { describe, expect, it } from "vitest";

import { LAUNCH_REGION } from "@/lib/launch-region";

describe("LAUNCH_REGION", () => {
  it("keeps the initial acquisition region centralized", () => {
    expect(LAUNCH_REGION.slug).toBe("mapo");
    expect(LAUNCH_REGION.label).toBe("서울 마포구");
    expect(LAUNCH_REGION.selectionHref).toBe("/onboarding");
    expect(LAUNCH_REGION.priorityLinks.map((link) => link.label)).toEqual([
      "분실/목격",
      "동물병원",
      "산책코스",
    ]);
  });

  it("keeps next region candidates explicit for future rollout decisions", () => {
    expect(LAUNCH_REGION.candidates.map((candidate) => candidate.slug)).toEqual([
      "seongdong",
      "songpa",
      "bundang",
    ]);
    expect(LAUNCH_REGION.candidates.every((candidate) => candidate.reason.length > 0)).toBe(true);
  });
});
