import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const APP_DIR = path.join(process.cwd(), "src/app");

function readAppFile(relativePath: string) {
  return readFileSync(path.join(APP_DIR, relativePath), "utf8");
}

describe("public acquisition copy metadata", () => {
  it("keeps the global app metadata aligned with the local information positioning", () => {
    const source = readAppFile("layout.tsx");

    expect(source).toContain("TownPet | 우리 동네 반려생활 정보");
    expect(source).toContain(
      "동물병원, 산책코스, 분실동물, 입양, 중고거래 정보를 지역별로 찾고 공유하는 동네 반려생활 정보 커뮤니티입니다.",
    );
    expect(source).not.toContain("동네 기반 반려동물 커뮤니티");
  });

  it("keeps feed and search metadata focused on high-intent local categories", () => {
    const feedSource = readAppFile("feed/page.tsx");
    const guestFeedSource = readAppFile("feed/guest/page.tsx");
    const searchSource = readAppFile("search/page.tsx");
    const guestSearchSource = readAppFile("search/guest/page.tsx");

    expect(feedSource).toContain("TownPet 동네 반려생활 피드");
    expect(guestFeedSource).toContain("TownPet 공개 동네 반려생활 피드");
    expect(searchSource).toContain("TownPet 동네 반려생활 검색");
    expect(guestSearchSource).toContain("TownPet 공개 동네 반려생활 검색");
    expect(`${feedSource}\n${guestFeedSource}`).toContain("병원 후기, 산책코스, 분실/목격 제보");
    expect(`${searchSource}\n${guestSearchSource}`).toContain("병원, 산책, 분실, 입양, 중고거래");
  });
});
