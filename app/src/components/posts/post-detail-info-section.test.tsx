import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  PostDetailInfoItem,
  PostDetailInfoSection,
  resolvePostDetailInfoItemSpanClass,
} from "@/components/posts/post-detail-info-section";

describe("PostDetailInfoSection", () => {
  it("renders a shared section shell and info items", () => {
    const html = renderToStaticMarkup(
      <PostDetailInfoSection title="산책코스 상세">
        <PostDetailInfoItem label="거리" value="3km" />
        <PostDetailInfoItem label="안전 태그" value="가로등" span="full" />
      </PostDetailInfoSection>,
    );

    expect(html).toContain("산책코스 상세");
    expect(html).toContain("거리");
    expect(html).toContain("3km");
    expect(html).toContain("안전 태그");
    expect(html).toContain("md:col-span-3");
  });

  it("uses compact divider cells instead of nested item cards", () => {
    const html = renderToStaticMarkup(
      <PostDetailInfoSection title="거래 정보">
        <PostDetailInfoItem label="상태" value="거래 가능" />
      </PostDetailInfoSection>,
    );

    expect(html).toContain("tp-card p-4 sm:p-5");
    expect(html).toContain("mt-3 grid gap-x-3 gap-y-2");
    expect(html).toContain("tp-border-soft border-t py-2.5");
    expect(html).not.toContain("tp-surface-soft rounded-lg border px-3 py-3");
  });

  it("falls back to the base width when an unknown span is requested", () => {
    expect(resolvePostDetailInfoItemSpanClass("unexpected")).toBe("");
  });
});
