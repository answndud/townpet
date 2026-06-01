import { PostType } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FeedInlineSearchForm } from "@/components/posts/feed-inline-search-form";

describe("FeedInlineSearchForm", () => {
  it("renders a compact feed-local search form with title/content options", () => {
    const html = renderToStaticMarkup(
      <FeedInlineSearchForm
        actionPath="/feed/guest"
        query="간식"
        searchIn="TITLE_CONTENT"
        resetHref="/feed/guest?type=FREE_POST"
        mode="BEST"
        type={PostType.FREE_POST}
        petTypeIds={["dog-community"]}
      />,
    );

    expect(html).toContain('action="/feed/guest"');
    expect(html).toContain('name="searchIn"');
    expect(html).toContain('value="TITLE_CONTENT"');
    expect(html).toContain("제목+내용");
    expect(html).toContain('value="TITLE"');
    expect(html).toContain('value="CONTENT"');
    expect(html).not.toContain('value="AUTHOR"');
    expect(html).toContain('name="mode"');
    expect(html).toContain('value="BEST"');
    expect(html).toContain('name="q"');
    expect(html).toContain('value="간식"');
    expect(html).toContain('name="type"');
    expect(html).toContain('name="petType"');
    expect(html).toContain('href="/feed/guest?type=FREE_POST"');
    expect(html).toContain("h-9");
    expect(html).toContain("검색어 입력");
    expect(html).toContain("focus-within:border-[#8fb5e8]");
    expect(html).toContain("rounded-[6px] bg-[#3567b5]");
    expect(html).toContain("hover:underline-offset-4");
    expect(html).not.toContain("tp-btn-primary");
    expect(html).not.toContain("tp-btn-soft");
  });
});
