import { headers } from "next/headers";

import type { GuestFeedPayload, GuestFeedResponse } from "@/lib/posts/guest-feed-types";

function appendQueryString(pathname: string, queryString: string) {
  return queryString.length > 0 ? `${pathname}?${queryString}` : pathname;
}

export async function fetchGuestFeedInitialData(queryString: string) {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const url = `${protocol}://${host}${appendQueryString("/api/feed/guest", queryString)}`;

  const response = await fetch(url, {
    headers: {
      cookie: requestHeaders.get("cookie") ?? "",
      "x-request-id": requestHeaders.get("x-request-id") ?? "",
    },
    next: { revalidate: 30 },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as GuestFeedResponse;
  if (!payload.ok) {
    return null;
  }

  return payload.data satisfies GuestFeedPayload;
}
