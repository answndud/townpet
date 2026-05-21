import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FeedPagination } from "@/components/posts/feed-pagination";

describe("FeedPagination", () => {
  it("renders accessible mobile-safe pagination controls", () => {
    const html = renderToStaticMarkup(
      <FeedPagination
        resolvedPage={3}
        totalPages={7}
        makeHref={({ nextPage }) => `/feed?page=${nextPage}`}
      />,
    );

    expect(html).toContain('aria-label="피드 페이지 이동"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("h-[30px]");
    expect(html).toContain("min-w-[30px]");
    expect(html).toContain("flex-wrap");
    expect(html).toContain('href="/feed?page=2"');
    expect(html).toContain('href="/feed?page=4"');
  });

  it("omits controls for a single page", () => {
    const html = renderToStaticMarkup(
      <FeedPagination
        resolvedPage={1}
        totalPages={1}
        makeHref={({ nextPage }) => `/feed?page=${nextPage}`}
      />,
    );

    expect(html).toBe("");
  });
});
