import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FeedPreviewList, HomeFeedPreview } from "@/components/home/home-feed-preview";

describe("FeedPreviewList", () => {
  it("uses an early-stage label that does not overclaim popularity", () => {
    const html = renderToStaticMarkup(
      <HomeFeedPreview
        data={{
          featured: [],
          latest: [],
        }}
      />,
    );

    expect(html).toContain("먼저 확인할 글");
    expect(html).toContain("공개 게시판");
    expect(html).toContain("공개 글 미리보기");
    expect(html).not.toContain("지금 많이 보는 글");
    expect(html).not.toContain("Live board");
  });

  it("renders compact action paths when the home live board column is empty", () => {
    const html = renderToStaticMarkup(
      <FeedPreviewList
        items={[]}
        emptyText="최근 올라온 공개 글이 아직 없습니다."
        emptyActions={[
          {
            href: "/guides/lost-pet-first-24-hours",
            label: "분실동물 첫 24시간 가이드",
          },
          {
            href: "/posts/new",
            label: "첫 글 작성하기",
          },
        ]}
      />,
    );

    expect(html).toContain("최근 올라온 공개 글이 아직 없습니다.");
    expect(html).toContain('href="/guides/lost-pet-first-24-hours"');
    expect(html).toContain("분실동물 첫 24시간 가이드");
    expect(html).toContain('href="/posts/new"');
    expect(html).toContain("첫 글 작성하기");
  });

  it("keeps the feed-shaped row when preview items are available", () => {
    const html = renderToStaticMarkup(
      <FeedPreviewList
        items={[
          {
            id: "post-1",
            href: "/posts/post-1",
            title: "동네 병원 후기",
            typeLabel: "병원 후기",
            createdAt: "2026-05-24T00:00:00.000Z",
            authorName: "알렉스",
            neighborhoodLabel: "서초구 잠원동",
            isOperatorContent: true,
            commentCount: 2,
            likeCount: 5,
          },
        ]}
        emptyText="최근 올라온 공개 글이 아직 없습니다."
        emptyActions={[
          {
            href: "/posts/new",
            label: "첫 글 작성하기",
          },
        ]}
      />,
    );

    expect(html).toContain('href="/posts/post-1"');
    expect(html).toContain("동네 병원 후기");
    expect(html).toContain("운영자 정리");
    expect(html).toContain("댓글 2");
    expect(html).not.toContain("첫 글 작성하기");
  });
});
