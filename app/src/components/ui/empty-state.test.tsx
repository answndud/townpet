import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EmptyState } from "@/components/ui/empty-state";

describe("EmptyState", () => {
  it("renders shared eyebrow copy, responsive layout, and primary action style", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        title="비어 있습니다"
        description="아직 데이터가 없습니다."
        actionHref="/feed"
        actionLabel="피드로 이동"
        secondaryActionHref="/posts/new"
        secondaryActionLabel="글쓰기"
      />,
    );

    expect(html).toContain("현재 상태");
    expect(html).toContain("tp-eyebrow");
    expect(html).toContain("tp-btn-primary tp-btn-md");
    expect(html).toContain("tp-btn-soft tp-btn-md");
    expect(html).toContain("text-left");
    expect(html).toContain("flex-col");
    expect(html).toContain("sm:flex-row");
    expect(html).toContain('href="/posts/new"');
  });

  it("allows contextual eyebrow copy", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        eyebrow="검색 결과"
        title="조건에 맞는 글이 없습니다"
        description="필터를 줄여보세요."
      />,
    );

    expect(html).toContain("검색 결과");
  });
});
