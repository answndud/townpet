import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { shouldReplaceGuestFeedCanonicalHref } from "@/components/posts/guest-feed-page-client";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

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

  it("keeps guest/member feed inline actions off legacy button tokens", () => {
    const code = [
      readSource("src/components/posts/guest-feed-page-client.tsx"),
      readSource("src/app/feed/page.tsx"),
    ].join("\n");

    expect(code).toContain("feedInlinePrimaryActionClassName");
    expect(code).toContain("feedInlineTextActionClassName");
    expect(code).toContain("rounded-md bg-[#3567b5]");
    expect(code).toContain("hover:underline-offset-4");
    expect(code).not.toContain("tp-btn-primary inline-flex h-[30px]");
    expect(code).not.toContain("tp-btn-soft hidden h-[30px]");
  });
});
