import { describe, expect, it } from "vitest";

import { buildGuestFeedRedirectHref } from "@/lib/posts/guest-feed-route";

describe("buildGuestFeedRedirectHref", () => {
  it("maps legacy communityId to petType and strips scope", () => {
    expect(
      buildGuestFeedRedirectHref({
        communityId: "c000000000000000000000201",
        scope: "GLOBAL",
        q: "강아지",
      }),
    ).toBe("/feed?q=%EA%B0%95%EC%95%84%EC%A7%80&petType=c000000000000000000000201");
  });

  it("keeps explicit petType filters and strips page=1", () => {
    expect(
      buildGuestFeedRedirectHref({
        communityId: "legacy-community",
        petType: ["c000000000000000000000201", "c000000000000000000000202"],
        page: "1",
        mode: "BEST",
      }),
    ).toBe(
      "/feed?petType=c000000000000000000000201&petType=c000000000000000000000202&mode=BEST",
    );
  });

  it("keeps non-default paging", () => {
    expect(
      buildGuestFeedRedirectHref({
        page: "3",
        sort: "LIKE",
      }),
    ).toBe("/feed?page=3&sort=LIKE");
  });
});
