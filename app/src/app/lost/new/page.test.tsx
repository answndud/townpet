import { describe, expect, it, vi } from "vitest";

import NewLostFoundPage from "@/app/lost/new/page";

const mockRedirect = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

describe("NewLostFoundPage", () => {
  it("redirects to the lost-found create form with the lost pet template", async () => {
    await NewLostFoundPage();

    expect(mockRedirect).toHaveBeenCalledWith(
      "/posts/new?type=LOST_FOUND&template=lost_pet",
    );
  });
});
