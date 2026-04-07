import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PostListContextBadges } from "@/components/posts/post-list-context-badges";
import { PostListItemShell } from "@/components/posts/post-list-item-shell";

describe("PostListItemShell", () => {
  it("renders shared content and meta sections with optional slots", () => {
    const html = renderToStaticMarkup(
      <PostListItemShell
        href="/posts/post-1"
        title={<span>테스트 제목</span>}
        titleSuffix={<span>[3]</span>}
        topContent={
          <PostListContextBadges
            label="자유게시판"
            chipClass="border-zinc-300 bg-zinc-100 text-zinc-700"
            locationLabel="서울 강남"
            status="HIDDEN"
          />
        }
        excerpt="요약 내용"
        bottomContent={<p>추가 내용</p>}
        meta={<p>메타 정보</p>}
      />,
    );

    expect(html).toContain("테스트 제목");
    expect(html).toContain("자유게시판");
    expect(html).toContain("서울 강남");
    expect(html).toContain("숨김");
    expect(html).toContain("요약 내용");
    expect(html).toContain("추가 내용");
    expect(html).toContain("메타 정보");
  });

  it("omits excerpt and optional badge rows when not provided", () => {
    const html = renderToStaticMarkup(
      <PostListItemShell
        href="/posts/post-2"
        title={<span>제목만</span>}
      />,
    );

    expect(html).toContain("제목만");
    expect(html).not.toContain("메타");
    expect(html).not.toContain("숨김");
    expect(html).not.toContain("요약 내용");
  });
});
