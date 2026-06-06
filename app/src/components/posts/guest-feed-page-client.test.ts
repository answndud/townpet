import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PostType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  buildGuestFeedHref,
  shouldReplaceGuestFeedCanonicalHref,
} from "@/components/posts/guest-feed-page-client";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("shouldReplaceGuestFeedCanonicalHref", () => {
  it("builds guest feed canonical hrefs with the guest base path", () => {
    expect(
      buildGuestFeedHref({
        basePath: "/feed/guest",
        type: null,
        reviewBoard: false,
        reviewCategory: null,
        petTypeIds: [],
        query: "",
        mode: "ALL",
        selectedSearchIn: "ALL",
        density: "DEFAULT",
        resolvedPage: 1,
      }),
    ).toBe("/feed/guest");

    expect(
      buildGuestFeedHref({
        basePath: "/feed/guest",
        type: PostType.FREE_BOARD,
        reviewBoard: false,
        reviewCategory: null,
        petTypeIds: [],
        query: "병원",
        mode: "BEST",
        selectedSearchIn: "TITLE_CONTENT",
        density: "DEFAULT",
        resolvedPage: 1,
      }),
    ).toBe(
      "/feed/guest?type=FREE_BOARD&q=%EB%B3%91%EC%9B%90&searchIn=TITLE_CONTENT&mode=BEST",
    );
  });

  it("does not canonicalize a new URL before matching guest feed data has loaded", () => {
    expect(
      shouldReplaceGuestFeedCanonicalHref({
        canonicalHref: "/feed/guest",
        currentHref: "/feed/guest?mode=BEST",
        loadedQueryString: "",
        queryString: "mode=BEST",
      }),
    ).toBe(false);
  });

  it("canonicalizes only after the loaded data matches the current query", () => {
    expect(
      shouldReplaceGuestFeedCanonicalHref({
        canonicalHref: "/feed/guest?mode=BEST",
        currentHref: "/feed/guest?mode=BEST&page=1",
        loadedQueryString: "mode=BEST&page=1",
        queryString: "mode=BEST&page=1",
      }),
    ).toBe(true);
  });

  it("keeps guest/member feed inline actions off legacy button tokens", () => {
    const code = [
      readSource("src/components/posts/guest-feed-page-client.tsx"),
      readSource("src/app/feed/page.tsx"),
    ].join("\n");

    expect(code).toContain("feedInlinePrimaryActionClassName");
    expect(code).toContain("rounded-md bg-[#3567b5]");
    expect(code).not.toContain("feedInlineTextActionClassName");
    expect(code).not.toContain('href="#feed-list"');
    expect(code).not.toContain("tp-btn-primary inline-flex h-[30px]");
    expect(code).not.toContain("tp-btn-soft hidden h-[30px]");
  });
});
