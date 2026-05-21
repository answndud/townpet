import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";

describe("HomePage", () => {
  it("renders a static public home with visible entry content", () => {
    const html = renderToStaticMarkup(<HomePage />);

    expect(html).toContain("우리 동네 반려생활 정보, TownPet");
    expect(html).toContain('href="/onboarding"');
    expect(html).toContain("내 동네 정보 보기");
    expect(html).toContain("분실동물 등록하기");
    expect(html).toContain("병원/산책 정보 보기");
    expect(html).toContain("필요한 정보를 바로 찾아보세요");
    expect(html).toContain("내 동네 설정하기");
    expect(html).toContain("관심 주제별로 둘러보기");
    expect(html).toContain("지금 올라온 동네 반려 정보");
    expect(html).not.toContain("첫 시작 지역");
    expect(html).not.toContain("/towns/");
  });
});
