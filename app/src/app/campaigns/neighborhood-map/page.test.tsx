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
    expect(html).toContain('href="/posts/new?type=WALK_ROUTE"');
    expect(html).toContain('href="/posts/new?type=HOSPITAL_REVIEW"');
    expect(html).toContain('href="/lost/new"');
    expect(html).toContain("운영자 검수 후 Founding Member 배지 부여");
    expect(html).toContain("창립 멤버");
    expect(html).toContain(">12<");
    expect(html).toContain("/campaigns/neighborhood-map");
  });

  it("is public and canonical to the campaign URL", () => {
    expect(metadata.alternates).toMatchObject({
      canonical: "/campaigns/neighborhood-map",
    });
    expect(metadata.title).toBe("우리 동네 반려생활 지도 만들기");
  });
});
