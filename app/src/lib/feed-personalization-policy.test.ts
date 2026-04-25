import { describe, expect, it } from "vitest";

import {
  FEED_PERSONALIZATION_AD_SIGNAL_CAP_MAX,
  DEFAULT_FEED_PERSONALIZATION_POLICY,
  normalizeFeedPersonalizationPolicy,
} from "@/lib/feed-personalization-policy";

describe("feed personalization policy", () => {
  it("falls back to defaults when persisted policy is invalid", () => {
    expect(
      normalizeFeedPersonalizationPolicy({
        ...DEFAULT_FEED_PERSONALIZATION_POLICY,
        personalizedRatio: 1.4,
      }),
    ).toEqual(DEFAULT_FEED_PERSONALIZATION_POLICY);
  });

  it("normalizes numeric string inputs", () => {
    expect(
      normalizeFeedPersonalizationPolicy({
        ...DEFAULT_FEED_PERSONALIZATION_POLICY,
        recencyDecayStep: "0.08",
        bookmarkSignalMultiplier: "1.25",
      }),
    ).toMatchObject({
      recencyDecayStep: 0.08,
      bookmarkSignalMultiplier: 1.25,
    });
  });

  it("keeps advertising signal cap below direct ranking-purchase strength", () => {
    expect(FEED_PERSONALIZATION_AD_SIGNAL_CAP_MAX).toBeLessThan(
      DEFAULT_FEED_PERSONALIZATION_POLICY.clickSignalCap,
    );

    expect(
      normalizeFeedPersonalizationPolicy({
        ...DEFAULT_FEED_PERSONALIZATION_POLICY,
        adSignalCap: 0.3,
      }),
    ).toEqual(DEFAULT_FEED_PERSONALIZATION_POLICY);
  });
});
