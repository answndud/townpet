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
    expect(html).toContain('href="/towns/mapo"');
    expect(html).toContain("마포구 지도 보기");
    expect(html).toContain("지금 올라온 동네 반려 정보");
    expect(html).toContain("지금은 마포구부터 만들고 있어요");
    expect(html).toContain("다음 후보: 서울 성동구");
    expect(html).toContain("마포구 반려생활 지도 만들기");
  });
});
