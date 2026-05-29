import { PostType } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FeedSearchForm } from "@/components/posts/feed-search-form";

describe("FeedSearchForm", () => {
  it("renders search and reset actions without legacy button tokens", () => {
    const html = renderToStaticMarkup(
      <FeedSearchForm
        actionPath="/feed/guest"
        query="병원"
        searchIn="TITLE"
        personalized="0"
        type={PostType.FREE_POST}
        scope="GLOBAL"
        mode="ALL"
        days={7}
        period={null}
        sort="LATEST"
        resetHref="/feed/guest"
      />,
    );

    expect(html).toContain("검색");
    expect(html).toContain("초기화");
    expect(html).toContain("rounded-md bg-[#3567b5]");
    expect(html).toContain("hover:underline-offset-4");
    expect(html).not.toContain("tp-btn-primary");
    expect(html).not.toContain("tp-btn-soft");
    expect(html).not.toContain("tp-btn-md");
  });
});
