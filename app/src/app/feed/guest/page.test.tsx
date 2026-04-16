import { Suspense } from "react";
import { describe, expect, it } from "vitest";

import GuestFeedPage from "@/app/feed/guest/page";
import { FeedLoadingSkeleton } from "@/components/posts/feed-loading-skeleton";

describe("GuestFeedPage", () => {
  it("keeps a suspense fallback instead of throwing a redirect", () => {
    const tree = GuestFeedPage();

    expect(tree.type).toBe(Suspense);
    expect(tree.props.fallback.type).toBe(FeedLoadingSkeleton);
  });
});
