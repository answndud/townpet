export const FEED_PERSONALIZATION_SURFACE_VALUES = [
  "FEED",
  "BREED_LOUNGE",
] as const;

export const FEED_PERSONALIZATION_EVENT_VALUES = [
  "VIEW",
  "POST_CLICK",
  "AD_IMPRESSION",
  "AD_CLICK",
] as const;

export const FEED_AUDIENCE_SOURCE_VALUES = [
  "SEGMENT",
  "PET",
  "NONE",
] as const;

export type FeedPersonalizationSurfaceValue =
  (typeof FEED_PERSONALIZATION_SURFACE_VALUES)[number];
export type FeedPersonalizationEventValue =
  (typeof FEED_PERSONALIZATION_EVENT_VALUES)[number];
export type FeedAudienceSourceValue =
  (typeof FEED_AUDIENCE_SOURCE_VALUES)[number];

export const FEED_PERSONALIZATION_SURFACE_LABELS: Record<
  FeedPersonalizationSurfaceValue,
  string
> = {
  FEED: "메인 피드",
  BREED_LOUNGE: "품종 라운지",
};

export const FEED_PERSONALIZATION_EVENT_LABELS: Record<
  FeedPersonalizationEventValue,
  string
> = {
  VIEW: "개인화 피드 조회",
  POST_CLICK: "개인화 게시글 클릭",
  AD_IMPRESSION: "광고 노출",
  AD_CLICK: "광고 클릭",
};

export const FEED_AUDIENCE_SOURCE_LABELS: Record<
  FeedAudienceSourceValue,
  string
> = {
  SEGMENT: "세그먼트",
  PET: "프로필 직접 신호",
  NONE: "신호 없음",
};

export function normalizeFeedAudienceDimension(
  value: string | null | undefined,
): string {
  const normalized = value?.trim().toUpperCase();
  return normalized && normalized.length > 0 ? normalized : "NONE";
}

export function toFeedAudienceSourceValue(source: "segment" | "pet" | "none") {
  switch (source) {
    case "segment":
      return "SEGMENT" as const;
    case "pet":
      return "PET" as const;
    default:
      return "NONE" as const;
  }
}
