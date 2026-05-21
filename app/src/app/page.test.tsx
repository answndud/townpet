import { describe, expect, it, vi } from "vitest";

import HomePage from "@/app/page";

const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("HomePage", () => {
  it("sends root traffic to the feed entry instead of rendering a landing page", () => {
    HomePage();

    expect(redirectMock).toHaveBeenCalledWith("/feed");
  });
});
