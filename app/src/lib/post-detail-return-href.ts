import type { PostType } from "@prisma/client";

import { buildBoardListingHref } from "@/lib/community-board";

const DEFAULT_GUEST_FEED_HREF = "/feed/guest";
const FEED_RETURN_PATHS = new Set(["/feed", DEFAULT_GUEST_FEED_HREF]);

export function resolveFeedReturnHref(
  referer: string | null | undefined,
  fallback = DEFAULT_GUEST_FEED_HREF,
) {
  if (!referer) {
    return fallback;
  }

  try {
    const url = new URL(referer, "http://townpet.local");
    if (!FEED_RETURN_PATHS.has(url.pathname)) {
      return fallback;
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}

export function buildGuestBoardListingHref(type?: PostType | null) {
  const href = buildBoardListingHref(type);

  if (href === "/feed") {
    return DEFAULT_GUEST_FEED_HREF;
  }

  if (href.startsWith("/feed?")) {
    return `${DEFAULT_GUEST_FEED_HREF}?${href.slice("/feed?".length)}`;
  }

  return href;
}
