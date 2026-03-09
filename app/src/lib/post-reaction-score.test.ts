import { describe, expect, it } from "vitest";

import {
  calculatePostReactionScore,
  getPostReactionScoreMagnitude,
  getPostReactionScoreTone,
} from "@/lib/post-reaction-score";

describe("post-reaction-score", () => {
  it("좋아요와 싫어요로 순반응 점수를 계산한다", () => {
    expect(calculatePostReactionScore(12, 5)).toBe(7);
    expect(calculatePostReactionScore(3, 9)).toBe(-6);
  });

  it("잘못된 반응 수는 0으로 보정한다", () => {
    expect(calculatePostReactionScore(Number.NaN, 4)).toBe(-4);
    expect(calculatePostReactionScore(-3, null)).toBe(0);
  });

  it("표시용 순반응 수는 방향과 무관하게 절대값으로 노출한다", () => {
    expect(getPostReactionScoreMagnitude(8)).toBe(8);
    expect(getPostReactionScoreMagnitude(-11)).toBe(11);
    expect(getPostReactionScoreMagnitude(Number.NaN)).toBe(0);
  });

  it("순반응 점수의 방향과 강도에 따라 색상 톤을 고른다", () => {
    expect(getPostReactionScoreTone(0)).toBe("neutral");
    expect(getPostReactionScoreTone(4)).toBe("positiveSoft");
    expect(getPostReactionScoreTone(12)).toBe("positive");
    expect(getPostReactionScoreTone(61)).toBe("positiveStrong");
    expect(getPostReactionScoreTone(-4)).toBe("negativeSoft");
    expect(getPostReactionScoreTone(-14)).toBe("negative");
    expect(getPostReactionScoreTone(-70)).toBe("negativeStrong");
  });
});
