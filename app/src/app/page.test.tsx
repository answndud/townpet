import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";

describe("HomePage", () => {
  it("renders a fast public home instead of redirect-only feed shell", () => {
    const html = renderToStaticMarkup(<HomePage />);

    expect(html).toContain("우리 동네 반려생활 정보, TownPet");
    expect(html).toContain('href="/feed/guest"');
    expect(html).toContain("내 동네 정보 보기");
    expect(html).toContain("분실동물 등록하기");
    expect(html).toContain("병원/산책 정보 보기");
    expect(html).toContain("지금 올라온 동네 반려 정보");
    expect(html).toContain("마포구 반려생활 지도 만들기");
  });
});
