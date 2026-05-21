import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import GuidePageRoute, {
  generateMetadata,
  generateStaticParams,
} from "@/app/guides/[guideSlug]/page";
import { getGuidePageBySlug, listGuidePages, listGuidePaths } from "@/lib/guide-pages";

describe("guide pages", () => {
  it("lists the acquisition guide routes", () => {
    expect(listGuidePaths()).toEqual([
      "/guides/lost-dog-poster",
      "/guides/24h-vet-checklist",
      "/guides/pet-used-trade-safety",
      "/guides/lost-pet-first-24-hours",
      "/guides/pet-hospital-review-policy",
    ]);
    expect(generateStaticParams()).toEqual(
      listGuidePages().map((guide) => ({ guideSlug: guide.slug })),
    );
  });

  it("renders a public guide with safety copy and feed CTAs", async () => {
    const html = renderToStaticMarkup(
      await GuidePageRoute({
        params: Promise.resolve({ guideSlug: "24h-vet-checklist" }),
      }),
    );

    expect(html).toContain("24시 동물병원 찾기 전 확인할 것");
    expect(html).toContain("전화로 확인할 것");
    expect(html).toContain('href="/feed/guest?type=HOSPITAL_REVIEW"');
    expect(html).toContain('href="/posts/new?type=HOSPITAL_REVIEW&amp;template=hospital_review"');
    expect(html).toContain("진단과 치료 판단은 수의사와 병원의 안내를 따르세요.");
  });

  it("generates canonical metadata for each guide", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ guideSlug: "pet-used-trade-safety" }),
    });

    expect(metadata.title).toBe("반려동물 중고용품 거래 안전 체크");
    expect(metadata.alternates).toEqual({
      canonical: "/guides/pet-used-trade-safety",
    });
    expect(metadata.openGraph).toMatchObject({
      url: "/guides/pet-used-trade-safety",
    });
  });

  it("returns null for unknown guide slugs", () => {
    expect(getGuidePageBySlug("unknown-guide")).toBeNull();
  });
});
