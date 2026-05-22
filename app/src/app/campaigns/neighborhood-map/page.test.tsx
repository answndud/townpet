import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/queries/campaign.queries", () => ({
  getNeighborhoodMapCampaignStats: vi.fn().mockResolvedValue({
    hospitalCount: 12,
    walkRouteCount: 7,
    reportCount: 9,
    contributorCount: 5,
  }),
}));

import NeighborhoodMapCampaignPage, { metadata } from "@/app/campaigns/neighborhood-map/page";

describe("NeighborhoodMapCampaignPage", () => {
  it("renders the campaign promise, participation CTAs, rewards, and live status", async () => {
    const html = renderToStaticMarkup(await NeighborhoodMapCampaignPage());

    expect(html).toContain("우리 동네 반려생활 지도 만들기");
    expect(html).toContain("첫 제보 남기기");
    expect(html).toContain('href="/posts/new?type=WALK_ROUTE&amp;template=walk_route_large_dog"');
    expect(html).toContain('href="/posts/new?type=HOSPITAL_REVIEW&amp;template=hospital_review"');
    expect(html).toContain('href="/lost/new"');
    expect(html).toContain("운영자 검수 후 Founding Member 배지 부여");
    expect(html).toContain("창립 멤버");
    expect(html).toContain(">12<");
    expect(html).toContain("/campaigns/neighborhood-map");
    expect(html).toContain("응급/야간 병원 체크 QR");
    expect(html).toContain("utm_source=hospital_qr");
    expect(html).toContain("분실동물 첫 24시간 QR");
  });

  it("accepts offline partner QR source on campaign views", async () => {
    const html = renderToStaticMarkup(
      await NeighborhoodMapCampaignPage({
        searchParams: {
          utm_source: "petcafe_qr",
        },
      }),
    );

    expect(html).toContain("동반가능 장소 제보 QR");
    expect(html).toContain("petcafe_qr");
  });

  it("is public and canonical to the campaign URL", () => {
    expect(metadata.alternates).toMatchObject({
      canonical: "/campaigns/neighborhood-map",
    });
    expect(metadata.title).toBe("우리 동네 반려생활 지도 만들기");
  });
});
