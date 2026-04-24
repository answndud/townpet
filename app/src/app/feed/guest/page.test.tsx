import { describe, expect, it } from "vitest";

import GuestFeedPage from "@/app/feed/guest/page";
import { GuestFeedPageClient } from "@/components/posts/guest-feed-page-client";

describe("GuestFeedPage", () => {
  it("renders the guest client without server-side initial data fetch", async () => {
    const tree = await GuestFeedPage();

    expect(tree.type).toBe(GuestFeedPageClient);
    expect(tree.props).toEqual({});
  });
});
