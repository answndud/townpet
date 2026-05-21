import { describe, expect, it } from "vitest";

import { buildHospitalReviewRiskSignals } from "@/server/hospital-review-risk";

describe("hospital review risk", () => {
  const now = new Date("2026-03-11T00:00:00.000Z");

  it("flags new accounts and repeated same-hospital reviews", () => {
    const result = buildHospitalReviewRiskSignals({
      accountCreatedAt: new Date("2026-03-08T00:00:00.000Z"),
      sameHospitalReviewCount30d: 1,
      recentHospitalReviewCount7d: 1,
      now,
    });

    expect(result.flagged).toBe(true);
    expect(result.signals).toEqual(["NEW_ACCOUNT", "SAME_HOSPITAL_REPEAT"]);
  });

  it("does not flag mature accounts with a single review", () => {
    const result = buildHospitalReviewRiskSignals({
      accountCreatedAt: new Date("2025-12-01T00:00:00.000Z"),
      sameHospitalReviewCount30d: 0,
      recentHospitalReviewCount7d: 1,
      now,
    });

    expect(result).toEqual({
      flagged: false,
      matchedTerms: [],
      signals: [],
    });
  });

  it("flags risky claim terms for moderator review", () => {
    const result = buildHospitalReviewRiskSignals({
      accountCreatedAt: new Date("2025-12-01T00:00:00.000Z"),
      sameHospitalReviewCount30d: 0,
      recentHospitalReviewCount7d: 1,
      text: "과잉진료 같아서 최악이었습니다.",
      now,
    });

    expect(result.flagged).toBe(true);
    expect(result.signals).toEqual(["RISKY_CLAIM_TERMS"]);
    expect(result.matchedTerms).toEqual(["과잉진료", "최악"]);
  });
});
