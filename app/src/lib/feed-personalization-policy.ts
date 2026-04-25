import { z } from "zod";

export const FEED_PERSONALIZATION_POLICY_KEY = "feed_personalization_policy_v1";
export const FEED_PERSONALIZATION_AD_SIGNAL_CAP_MAX = 0.08;

export const DEFAULT_FEED_PERSONALIZATION_POLICY = {
  recencyDecayStep: 0.12,
  recencyDecayFloor: 0.28,
  personalizedRatio: 0.65,
  personalizedThreshold: 0.05,
  clickSignalMultiplier: 1,
  clickSignalCap: 0.095,
  adSignalMultiplier: 1,
  adSignalCap: 0.065,
  dwellSignalMultiplier: 1,
  dwellSignalCap: 0.13,
  bookmarkSignalMultiplier: 1,
  bookmarkSignalCap: 0.15,
} as const;

export const feedPersonalizationPolicySchema = z.object({
  recencyDecayStep: z.coerce.number().min(0.01).max(0.4),
  recencyDecayFloor: z.coerce.number().min(0).max(1),
  personalizedRatio: z.coerce.number().min(0.35).max(0.85),
  personalizedThreshold: z.coerce.number().min(0).max(0.4),
  clickSignalMultiplier: z.coerce.number().min(0).max(3),
  clickSignalCap: z.coerce.number().min(0).max(0.3),
  adSignalMultiplier: z.coerce.number().min(0).max(3),
  adSignalCap: z.coerce.number().min(0).max(FEED_PERSONALIZATION_AD_SIGNAL_CAP_MAX),
  dwellSignalMultiplier: z.coerce.number().min(0).max(3),
  dwellSignalCap: z.coerce.number().min(0).max(0.35),
  bookmarkSignalMultiplier: z.coerce.number().min(0).max(3),
  bookmarkSignalCap: z.coerce.number().min(0).max(0.35),
});

export type FeedPersonalizationPolicy = z.infer<typeof feedPersonalizationPolicySchema>;

export function normalizeFeedPersonalizationPolicy(
  value: unknown,
  fallback: FeedPersonalizationPolicy = DEFAULT_FEED_PERSONALIZATION_POLICY,
): FeedPersonalizationPolicy {
  const parsed = feedPersonalizationPolicySchema.safeParse(value);
  if (!parsed.success) {
    return { ...fallback };
  }

  return parsed.data;
}
