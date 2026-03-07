"use client";

import type {
  FeedAudienceSourceValue,
  FeedPersonalizationEventValue,
  FeedPersonalizationSurfaceValue,
} from "@/lib/feed-personalization-metrics";

export async function sendFeedPersonalizationMetric(input: {
  surface: FeedPersonalizationSurfaceValue;
  event: FeedPersonalizationEventValue;
  audienceKey?: string | null;
  breedCode?: string | null;
  audienceSource: FeedAudienceSourceValue;
  postId?: string | null;
}) {
  if (typeof window === "undefined") {
    return;
  }

  await fetch("/api/feed/personalization", {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  }).catch(() => undefined);
}

export function resolveFeedPersonalizationSurfaceFromReferrer(): FeedPersonalizationSurfaceValue {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return "FEED";
  }

  try {
    const referrer = document.referrer ? new URL(document.referrer) : null;
    if (
      referrer &&
      referrer.origin === window.location.origin &&
      referrer.pathname.startsWith("/lounges/breeds/")
    ) {
      return "BREED_LOUNGE";
    }
  } catch {
    return "FEED";
  }

  return "FEED";
}
