import { describe, expect, it, vi } from "vitest";

import SavedPage from "@/app/saved/page";

const mockRedirect = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

describe("saved route redirect", () => {
  it("redirects saved path to bookmarks path while preserving search params", async () => {
    await SavedPage({
      searchParams: Promise.resolve({
        q: "산책",
        page: "2",
        type: "FREE_POST",
      }),
    });

    expect(mockRedirect).toHaveBeenCalledWith(
      "/bookmarks?type=FREE_POST&q=%EC%82%B0%EC%B1%85&page=2",
    );
  });

  it("redirects bare saved path to bookmarks root", async () => {
    await SavedPage({});

    expect(mockRedirect).toHaveBeenCalledWith("/bookmarks");
  });
});
