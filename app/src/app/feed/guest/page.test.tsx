import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";

import GuestFeedPage from "@/app/feed/guest/page";

describe("GuestFeedPage", () => {
  it("keeps a suspense fallback instead of throwing a redirect", () => {
    const tree = GuestFeedPage();
    const fallbackTitle =
      tree.props.fallback?.props?.children?.props?.children?.props?.children?.props?.title;

    expect(tree.type).toBe(Suspense);
    expect(String(fallbackTitle ?? "")).toContain("피드를 준비 중입니다");
  });
});
