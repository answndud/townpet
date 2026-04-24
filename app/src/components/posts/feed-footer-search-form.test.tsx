import { PostType } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FeedFooterSearchForm } from "@/components/posts/feed-footer-search-form";

describe("FeedFooterSearchForm", () => {
  it("renders a compact feed-local search form with title and content options", () => {
    const html = renderToStaticMarkup(
      <FeedFooterSearchForm
        actionPath="/feed/guest"
        query="간식"
        searchIn="CONTENT"
        resetHref="/feed/guest?type=FREE_POST"
        type={PostType.FREE_POST}
        petTypeIds={["dog-community"]}
      />,
    );

    expect(html).toContain('action="/feed/guest"');
    expect(html).toContain('name="searchIn"');
    expect(html).toContain('value="TITLE"');
    expect(html).toContain('value="CONTENT"');
    expect(html).not.toContain('value="AUTHOR"');
    expect(html).toContain('name="q"');
    expect(html).toContain('value="간식"');
    expect(html).toContain('name="type"');
    expect(html).toContain('name="petType"');
    expect(html).toContain('href="/feed/guest?type=FREE_POST"');
  });
});
