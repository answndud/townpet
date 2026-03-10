import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_SCROLL_TO_TOP_THRESHOLD,
  scrollWindowToTop,
  shouldShowScrollToTopButton,
} from "@/components/ui/scroll-to-top-button";

describe("scroll-to-top-button helpers", () => {
  it("keeps the floating button hidden before the threshold", () => {
    expect(
      shouldShowScrollToTopButton(DEFAULT_SCROLL_TO_TOP_THRESHOLD - 1),
    ).toBe(false);
  });

  it("shows the floating button once the threshold is reached", () => {
    expect(
      shouldShowScrollToTopButton(DEFAULT_SCROLL_TO_TOP_THRESHOLD),
    ).toBe(true);
  });

  it("scrolls the page back to the top with smooth behavior", () => {
    const scrollTo = vi.fn();

    scrollWindowToTop({ scrollTo });

    expect(scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });
  });
});
