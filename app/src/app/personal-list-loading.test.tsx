import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import BookmarksLoading from "@/app/bookmarks/loading";
import MyPostsLoading from "@/app/my-posts/loading";

function countRows(html: string) {
  return html.match(/md:grid-cols-\[minmax\(0,1fr\)_196px\]/g)?.length ?? 0;
}

describe("personal list loading states", () => {
  it("matches the bookmarks page shell instead of showing generic blocks", () => {
    const html = renderToStaticMarkup(<BookmarksLoading />);

    expect(html).toContain("tp-page-bg");
    expect(html).toContain("tp-hero");
    expect(html).toContain("tp-card");
    expect(html).toContain("tp-soft-card");
    expect(html).toContain("북마크 화면 로딩 중");
    expect(countRows(html)).toBe(3);
  });

  it("matches the my-posts page shell instead of showing generic blocks", () => {
    const html = renderToStaticMarkup(<MyPostsLoading />);

    expect(html).toContain("tp-page-bg");
    expect(html).toContain("tp-hero");
    expect(html).toContain("tp-card");
    expect(html).toContain("tp-soft-card");
    expect(html).toContain("내 작성글 화면 로딩 중");
    expect(countRows(html)).toBe(3);
  });
});
