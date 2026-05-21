import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";

describe("HomePage", () => {
  it("renders a static public home with visible entry content", () => {
    const html = renderToStaticMarkup(<HomePage />);

    expect(html).toContain("우리 동네 반려생활 정보, TownPet");
    expect(html).toContain('href="/onboarding"');
    expect(html).toContain("내 동네 허브 시작하기");
    expect(html).toContain("관심 주제별로 둘러보기");
    expect(html).toContain('href="/feed/guest?type=LOST_FOUND"');
    expect(html).toContain("지금 올라온 동네 반려 정보");
    expect(html).not.toContain("첫 시작 지역");
    expect(html).not.toContain("/towns/");
    expect(html).not.toContain("처음 방문했다면");
    expect(html).not.toContain("내 동네를 선택");
  });

  it("keeps the static home entry focused on one onboarding CTA", () => {
    const html = renderToStaticMarkup(<HomePage />);

    expect((html.match(/href="\/onboarding"/g) ?? []).length).toBe(1);
    expect(html).not.toContain("분실동물 등록하기");
    expect(html).not.toContain("병원/산책 정보 보기");
  });
});
