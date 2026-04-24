import { describe, expect, it, vi } from "vitest";

import GuestSearchPage from "@/app/search/guest/page";

const mockRedirect = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

describe("guest search route redirect", () => {
  it("redirects /search/guest to /feed/guest while preserving supported query params", async () => {
    await GuestSearchPage({
      searchParams: Promise.resolve({
        q: "사료",
        type: "FREE_POST",
        searchIn: "TITLE",
      }),
    });

    expect(mockRedirect).toHaveBeenCalledWith(
      "/feed/guest?q=%EC%82%AC%EB%A3%8C&type=FREE_POST&searchIn=TITLE",
    );
  });
});
