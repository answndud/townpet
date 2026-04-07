import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FeedControlPanel } from "@/components/posts/feed-control-panel";

describe("FeedControlPanel", () => {
  it("renders hierarchical feed controls with personalization summary", () => {
    const html = renderToStaticMarkup(
      <FeedControlPanel
        mode="ALL"
        selectedSort="COMMENT"
        bestDays={7}
        periodDays={30}
        reviewBoard
        reviewCategory="TOY"
        makeHref={() => "/feed"}
        personalized={{
          active: true,
          currentLabel: "강아지 · 장난감",
          title: "장난감 리뷰를 먼저 보여드려요",
          description: "최근 반응과 프로필을 기준으로 순서를 조정합니다.",
          emphasis: "프로필 반영 중",
          profileHref: "/profile",
        }}
      />,
    );

    expect(html).toContain("피드 보기");
    expect(html).toContain("추천 방식");
    expect(html).toContain("현재 기준");
    expect(html).toContain("장난감 리뷰를 먼저 보여드려요");
    expect(html).toContain("리뷰");
    expect(html).toContain("댓글");
    expect(html).toContain("30일");
    expect(html).toContain("data-testid=\"feed-sort-range-row\"");
  });

  it("omits personalization summary when the section is not provided", () => {
    const html = renderToStaticMarkup(
      <FeedControlPanel
        mode="BEST"
        selectedSort="LATEST"
        bestDays={3}
        periodDays={null}
        reviewBoard={false}
        reviewCategory={null}
        makeHref={() => "/feed?mode=BEST"}
      />,
    );

    expect(html).not.toContain("추천 방식");
    expect(html).toContain("집계 기간");
    expect(html).toContain("최근 3일");
  });
});
