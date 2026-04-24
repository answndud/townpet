import { describe, expect, it } from "vitest";

import { shouldReplaceGuestFeedCanonicalHref } from "@/components/posts/guest-feed-page-client";

describe("shouldReplaceGuestFeedCanonicalHref", () => {
  it("does not canonicalize a new URL before matching guest feed data has loaded", () => {
    expect(
      shouldReplaceGuestFeedCanonicalHref({
        canonicalHref: "/feed/guest",
        currentHref: "/feed/guest?sort=LIKE",
        loadedQueryString: "",
        queryString: "sort=LIKE",
      }),
    ).toBe(false);
  });

  it("canonicalizes only after the loaded data matches the current query", () => {
    expect(
      shouldReplaceGuestFeedCanonicalHref({
        canonicalHref: "/feed/guest?sort=LIKE",
        currentHref: "/feed/guest?sort=LIKE&page=1",
        loadedQueryString: "sort=LIKE&page=1",
        queryString: "sort=LIKE&page=1",
      }),
    ).toBe(true);
  });
});
