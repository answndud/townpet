import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomePage, { revalidate } from "@/app/page";
import { getHomeFeedPayload } from "@/server/queries/home-feed.queries";

vi.mock("@/server/queries/home-feed.queries", () => ({
  getHomeFeedPayload: vi.fn(),
}));

const mockGetHomeFeedPayload = vi.mocked(getHomeFeedPayload);

describe("HomePage", () => {
  it("keeps the landing page revalidation window long enough to avoid frequent regeneration outliers", () => {
    expect(revalidate).toBe(300);
  });

  beforeEach(() => {
    mockGetHomeFeedPayload.mockResolvedValue({
      featured: [],
      latest: [],
    });
  });

  it("renders a static public home with visible entry content", async () => {
    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("우리 동네 반려생활 정보");
    expect(html).toContain('href="/onboarding"');
    expect(html).toContain('href="/feed/guest"');
    expect(html.indexOf("전체 피드")).toBeLessThan(
      html.indexOf("내 동네 설정"),
    );
    expect(html).toContain("내 동네 설정");
    expect(html).toContain("관심 주제");
    expect(html).toContain('href="/campaigns/neighborhood-map"');
    expect(html).toContain('href="/lost-found"');
    expect(html).toContain("지금 올라온 글");
    expect(html).not.toContain("첫 시작 지역");
    expect(html).not.toContain("/towns/");
    expect(html).not.toContain("처음 방문했다면");
    expect(html).not.toContain("내 동네를 선택");
  });

  it("keeps the static home entry focused on one onboarding CTA", async () => {
    const html = renderToStaticMarkup(await HomePage());

    expect((html.match(/href="\/onboarding"/g) ?? []).length).toBe(1);
    expect((html.match(/href="\/feed\/guest"/g) ?? []).length).toBe(1);
    expect(html).not.toContain("분실동물 등록하기");
  });

  it("server-renders home feed rows instead of waiting for client skeletons", async () => {
    mockGetHomeFeedPayload.mockResolvedValue({
      featured: [
        {
          id: "post-1",
          href: "/posts/post-1",
          title: "마포구 야간 병원 확인",
          excerpt: "방문 전 전화로 확인했습니다.",
          type: "HOSPITAL_REVIEW",
          typeLabel: "병원 후기",
          createdAt: "2026-05-30T00:00:00.000Z",
          authorName: "TownPet 운영팀",
          neighborhoodLabel: "마포구",
          isOperatorContent: true,
          operatorSourceName: "TownPet 운영자 정리",
          operatorSourceUrl: null,
          operatorLastVerifiedAt: "2026-05-30T00:00:00.000Z",
          commentCount: 0,
          likeCount: 1,
          viewCount: 5,
        },
      ],
      latest: [],
    });

    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("마포구 야간 병원 확인");
    expect(html).not.toContain("animate-pulse");
  });
});
