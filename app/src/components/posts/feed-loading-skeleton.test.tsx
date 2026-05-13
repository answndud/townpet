import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FeedLoadingSkeleton } from "@/components/posts/feed-loading-skeleton";

describe("FeedLoadingSkeleton", () => {
  it("exposes a loading status while keeping the feed shell stable", () => {
    const html = renderToStaticMarkup(<FeedLoadingSkeleton />);

    expect(html).toContain('data-testid="feed-loading-skeleton"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="피드를 불러오는 중"');
    expect(html).toContain("max-w-[1320px]");
  });
});
