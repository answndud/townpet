import { describe, expect, it } from "vitest";
import { PostType } from "@prisma/client";

import {
  buildGuestBoardListingHref,
  resolveFeedReturnHref,
} from "@/lib/post-detail-return-href";

describe("resolveFeedReturnHref", () => {
  it("preserves guest feed query context from the referer", () => {
    expect(resolveFeedReturnHref("http://localhost:3000/feed/guest?mode=BEST")).toBe(
      "/feed/guest?mode=BEST",
    );
  });

  it("preserves member feed query context from the referer", () => {
    expect(resolveFeedReturnHref("/feed?type=FREE_POST&page=2")).toBe(
      "/feed?type=FREE_POST&page=2",
    );
  });

  it("falls back when the referer is not a feed page", () => {
    expect(resolveFeedReturnHref("http://localhost:3000/posts/post-1/guest")).toBe(
      "/feed/guest",
    );
    expect(resolveFeedReturnHref(null)).toBe("/feed/guest");
  });
});

describe("buildGuestBoardListingHref", () => {
  it("uses the guest feed surface for normal board links", () => {
    expect(buildGuestBoardListingHref(PostType.FREE_POST)).toBe(
      "/feed/guest?type=FREE_POST&page=1",
    );
  });

  it("keeps dedicated board routes intact", () => {
    expect(buildGuestBoardListingHref(PostType.ADOPTION_LISTING)).toBe("/boards/adoption");
  });
});
