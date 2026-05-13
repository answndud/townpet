import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CompactPagination } from "@/components/ui/compact-pagination";

describe("CompactPagination", () => {
  it("renders mobile-safe accessible pagination controls", () => {
    const html = renderToStaticMarkup(
      <CompactPagination
        ariaLabel="알림 페이지 이동"
        currentPage={2}
        totalPages={5}
        makeHref={(page) => `/notifications?page=${page}`}
      />,
    );

    expect(html).toContain('aria-label="알림 페이지 이동"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("min-h-10");
    expect(html).toContain("min-w-10");
    expect(html).toContain("flex-wrap");
    expect(html).toContain('href="/notifications?page=1"');
    expect(html).toContain('href="/notifications?page=3"');
  });

  it("omits controls for a single page", () => {
    const html = renderToStaticMarkup(
      <CompactPagination
        ariaLabel="활동 페이지 이동"
        currentPage={1}
        totalPages={1}
        makeHref={(page) => `/users/user-1?page=${page}`}
      />,
    );

    expect(html).toBe("");
  });
});
