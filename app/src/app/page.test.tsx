import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";

describe("HomePage", () => {
  it("renders a static public home with visible entry content", () => {
    const html = renderToStaticMarkup(<HomePage />);

    expect(html).toContain("우리 동네 반려생활 정보");
    expect(html).toContain('href="/onboarding"');
    expect(html).toContain('href="/feed/guest"');
    expect(html.indexOf("전체 피드")).toBeLessThan(
      html.indexOf("내 동네 설정"),
    );
    expect(html).toContain("내 동네 설정");
    expect(html).toContain("관심 주제");
    expect(html).toContain('href="/campaigns/neighborhood-map"');
    expect(html).toContain('href="/feed/guest?type=LOST_FOUND"');
    expect(html).toContain("지금 올라온 글");
    expect(html).not.toContain("첫 시작 지역");
    expect(html).not.toContain("/towns/");
    expect(html).not.toContain("처음 방문했다면");
    expect(html).not.toContain("내 동네를 선택");
  });

  it("keeps the static home entry focused on one onboarding CTA", () => {
    const html = renderToStaticMarkup(<HomePage />);

    expect((html.match(/href="\/onboarding"/g) ?? []).length).toBe(1);
    expect((html.match(/href="\/feed\/guest"/g) ?? []).length).toBe(1);
    expect(html).not.toContain("분실동물 등록하기");
  });
});
