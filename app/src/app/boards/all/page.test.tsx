import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AllCommonBoardsPage from "@/app/boards/all/page";

describe("AllCommonBoardsPage", () => {
  it("provides a direct hub for every common board", () => {
    const html = renderToStaticMarkup(<AllCommonBoardsPage />);

    expect(html).toContain("전체 공통게시판");
    expect(html).toContain('href="/boards/adoption"');
    expect(html).toContain('href="/lost-found"');
    expect(html).toContain('href="/feed/guest?type=HOSPITAL_REVIEW"');
    expect(html).toContain('href="/feed/guest?type=MARKET_LISTING"');
  });
});
