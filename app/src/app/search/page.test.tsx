import { describe, expect, it, vi } from "vitest";

import SearchPage from "@/app/search/page";
import { buildFeedSearchRedirectPath } from "@/lib/feed-search-redirect";

const mockRedirect = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

describe("search route redirect", () => {
  it("maps legacy search queries to feed search params", () => {
    expect(
      buildFeedSearchRedirectPath("/feed", {
        q: " 산책  코스 ",
        type: "FREE_POST",
        searchIn: "TITLE",
      }),
    ).toBe("/feed?q=%EC%82%B0%EC%B1%85+%EC%BD%94%EC%8A%A4&type=FREE_POST&searchIn=TITLE");
  });

  it("redirects /search to /feed while preserving supported query params", async () => {
    await SearchPage({
      searchParams: Promise.resolve({
        q: "간식",
        type: "FREE_POST",
        searchIn: "CONTENT",
      }),
    });

    expect(mockRedirect).toHaveBeenCalledWith(
      "/feed?q=%EA%B0%84%EC%8B%9D&type=FREE_POST&searchIn=CONTENT",
    );
  });
});
