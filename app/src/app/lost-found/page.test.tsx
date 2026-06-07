import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import LostFoundLandingPage, { metadata, revalidate } from "@/app/lost-found/page";
import { getPublicLostFoundLandingPayload } from "@/server/queries/lost-found.queries";

vi.mock("@/server/queries/lost-found.queries", () => ({
  getPublicLostFoundLandingPayload: vi.fn(),
}));

const mockGetPublicLostFoundLandingPayload = vi.mocked(getPublicLostFoundLandingPayload);

describe("LostFoundLandingPage", () => {
  it("renders the public lost-found acquisition flow with safety copy and CTAs", async () => {
    mockGetPublicLostFoundLandingPayload.mockResolvedValueOnce({
      activeCount: 1,
      recentPosts: [
        {
          id: "post-1",
          href: "/posts/post-1/guest",
          title: "망원동에서 흰색 강아지를 찾고 있어요",
          authorName: "익명",
          createdAt: new Date("2026-06-01T10:00:00.000Z"),
          commentCount: 2,
          viewCount: 30,
          likeCount: 4,
          alert: {
            alertType: "LOST",
            petType: "강아지",
            breed: "흰색 말티즈",
            lastSeenAt: new Date("2026-06-01T09:30:00.000Z"),
            lastSeenLocation: "망원시장 근처",
            status: "ACTIVE",
          },
        },
      ],
    });

    const html = renderToStaticMarkup(await LostFoundLandingPage());

    expect(revalidate).toBe(300);
    expect(metadata.alternates).toEqual({ canonical: "/lost-found" });
    expect(mockGetPublicLostFoundLandingPayload).toHaveBeenCalledWith({ limit: 6 });
    expect(html).toContain("우리 동네 분실동물 제보를 빠르게 정리하고 공유하세요");
    expect(html).toContain('href="/posts/new?type=LOST_FOUND&amp;template=lost_pet"');
    expect(html).toContain('href="/feed/guest?type=LOST_FOUND"');
    expect(html).toContain('href="/guides/lost-pet-first-24-hours"');
    expect(html).toContain("망원동에서 흰색 강아지를 찾고 있어요");
    expect(html).toContain("마지막 확인 위치: 망원시장 근처");
    expect(html).toContain("전화번호, 오픈채팅, 이메일은 공개 본문에 적지 않습니다.");
    expect(html).toContain("링크 복사, 카카오톡 문구, 인스타/전단 이미지");
  });

  it("renders an empty-state action without pretending reports exist", async () => {
    mockGetPublicLostFoundLandingPayload.mockResolvedValueOnce({
      activeCount: 0,
      recentPosts: [],
    });

    const html = renderToStaticMarkup(await LostFoundLandingPage());

    expect(html).toContain("최근 공개된 분실/목격 제보가 없습니다.");
    expect(html).toContain("첫 제보 등록");
    expect(html).toContain("0건");
  });
});
