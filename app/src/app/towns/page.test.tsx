import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import TownPage, { generateMetadata as generateTownMetadata } from "@/app/towns/[townSlug]/page";
import TownSectionPage, {
  generateMetadata as generateTownSectionMetadata,
} from "@/app/towns/[townSlug]/[sectionSlug]/page";

describe("town landing pages", () => {
  it("renders the Mapo town hub with section links", async () => {
    const html = renderToStaticMarkup(
      await TownPage({ params: Promise.resolve({ townSlug: "mapo" }) }),
    );

    expect(html).toContain("마포구 반려생활 지도");
    expect(html).toContain('href="/towns/mapo/hospitals"');
    expect(html).toContain('href="/towns/mapo/walks"');
    expect(html).toContain('href="/towns/mapo/lost"');
    expect(html).toContain('href="/towns/mapo/used-market"');
    expect(html).toContain("최근 등록된 분실/목격 제보가 없습니다.");
  });

  it("renders a section page with feed and contribution links", async () => {
    const html = renderToStaticMarkup(
      await TownSectionPage({
        params: Promise.resolve({ townSlug: "mapo", sectionSlug: "hospitals" }),
      }),
    );

    expect(html).toContain("마포구 동물병원 정보");
    expect(html).toContain('href="/feed/guest?type=HOSPITAL_REVIEW"');
    expect(html).toContain("방문 전 전화 확인");
  });

  it("generates canonical metadata for town hub and section pages", async () => {
    await expect(
      generateTownMetadata({ params: Promise.resolve({ townSlug: "mapo" }) }),
    ).resolves.toMatchObject({
      title: "마포구 반려생활 지도",
      alternates: { canonical: "/towns/mapo" },
    });

    await expect(
      generateTownSectionMetadata({
        params: Promise.resolve({ townSlug: "mapo", sectionSlug: "lost" }),
      }),
    ).resolves.toMatchObject({
      title: "마포구 분실/목격 제보",
      alternates: { canonical: "/towns/mapo/lost" },
    });
  });
});
