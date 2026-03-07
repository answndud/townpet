"use client";

import { useEffect } from "react";

import {
  resolveFeedPersonalizationSurfaceFromReferrer,
  sendFeedPersonalizationMetric,
} from "@/lib/feed-personalization-tracking";

const MIN_POST_DWELL_MS = 12_000;

type PostPersonalizationDwellTrackerProps = {
  postId: string;
  enabled: boolean;
};

export function PostPersonalizationDwellTracker({
  postId,
  enabled,
}: PostPersonalizationDwellTrackerProps) {
  useEffect(() => {
    if (!enabled || typeof document === "undefined" || typeof window === "undefined") {
      return;
    }

    const startedAt = Date.now();
    const surface = resolveFeedPersonalizationSurfaceFromReferrer();
    let sent = false;

    const maybeTrackDwell = () => {
      if (sent) {
        return;
      }
      if (Date.now() - startedAt < MIN_POST_DWELL_MS) {
        return;
      }

      sent = true;
      void sendFeedPersonalizationMetric({
        surface,
        event: "POST_DWELL",
        audienceSource: "NONE",
        postId,
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        maybeTrackDwell();
      }
    };

    window.addEventListener("pagehide", maybeTrackDwell);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", maybeTrackDwell);
      maybeTrackDwell();
    };
  }, [enabled, postId]);

  return null;
}
