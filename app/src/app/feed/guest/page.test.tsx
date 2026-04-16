import { describe, expect, it, vi } from "vitest";

import GuestFeedPage from "@/app/feed/guest/page";
import { GuestFeedPageClient } from "@/components/posts/guest-feed-page-client";

vi.mock("@/server/services/posts/guest-feed-page-fetch.service", () => ({
  fetchGuestFeedInitialData: vi.fn(),
}));

import { fetchGuestFeedInitialData } from "@/server/services/posts/guest-feed-page-fetch.service";

const mockFetchGuestFeedInitialData = vi.mocked(fetchGuestFeedInitialData);

describe("GuestFeedPage", () => {
  it("passes server-fetched initial data into the guest client", async () => {
    mockFetchGuestFeedInitialData.mockResolvedValueOnce({
      view: "feed",
      feed: {
        mode: "ALL",
        type: null,
        reviewBoard: false,
        reviewCategory: null,
        petTypeId: null,
        petTypeIds: [],
        query: "",
        selectedSort: "LATEST",
        selectedSearchIn: "ALL",
        density: "DEFAULT",
        bestDays: 7,
        periodDays: null,
        isGuestTypeBlocked: false,
        feedTitle: "전체 게시판",
        totalPages: 1,
        resolvedPage: 1,
        feedQueryKey: "test",
        items: [],
        nextCursor: null,
      },
    });

    const tree = await GuestFeedPage({
      searchParams: Promise.resolve({ type: "SHELTER_VOLUNTEER", page: "1" }),
    });

    expect(mockFetchGuestFeedInitialData).toHaveBeenCalledWith("type=SHELTER_VOLUNTEER&page=1");
    expect(tree.type).toBe(GuestFeedPageClient);
    expect(tree.props.initialQueryString).toBe("type=SHELTER_VOLUNTEER&page=1");
    expect(tree.props.initialData).toMatchObject({
      view: "feed",
      feed: { feedTitle: "전체 게시판" },
    });
  });
});
