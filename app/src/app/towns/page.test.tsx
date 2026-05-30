import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TownPage, {
  generateMetadata as generateTownMetadata,
  generateStaticParams as generateTownStaticParams,
} from "@/app/towns/[townSlug]/page";
import TownSectionPage, {
  generateMetadata as generateTownSectionMetadata,
  generateStaticParams as generateTownSectionStaticParams,
} from "@/app/towns/[townSlug]/[sectionSlug]/page";
import { buildTownLanding } from "@/lib/town-landing";
import { getTownLandingByNeighborhoodSlug } from "@/server/queries/neighborhood.queries";

vi.mock("@/server/queries/neighborhood.queries", () => ({
  getTownLandingByNeighborhoodSlug: vi.fn(),
}));

const mockGetTownLandingByNeighborhoodSlug = vi.mocked(getTownLandingByNeighborhoodSlug);

describe("town landing pages", () => {
  beforeEach(() => {
    mockGetTownLandingByNeighborhoodSlug.mockReset();
  });

  it("does not prerender a fixed town while the launch region is undecided", () => {
    expect(generateTownStaticParams()).toEqual([]);
    expect(generateTownSectionStaticParams()).toEqual([]);
  });

  it("renders a dynamic town hub from the selected neighborhood region", async () => {
    const town = buildTownLanding({
      city: "서울특별시",
      district: "강남구",
      counts: { hospitals: 2, lost: 1 },
    });
    mockGetTownLandingByNeighborhoodSlug.mockResolvedValueOnce(town);

    const html = renderToStaticMarkup(
      await TownPage({
        params: Promise.resolve({ townSlug: "서울특별시--강남구" }),
      }),
    );

    expect(mockGetTownLandingByNeighborhoodSlug).toHaveBeenCalledWith("서울특별시--강남구");
    expect(html).toContain("강남구 반려생활 허브");
    expect(html).toContain("등록된 글 2개");
    expect(html).toContain("24시 동물병원");
    expect(html).toContain("분실/목격 등록");
  });

  it("generates canonical metadata for a dynamic town section", async () => {
    const town = buildTownLanding({
      city: "서울특별시",
      district: "강남구",
      counts: { hospitals: 2 },
    });
    mockGetTownLandingByNeighborhoodSlug.mockResolvedValueOnce(town);

    await expect(
      generateTownSectionMetadata({
        params: Promise.resolve({ townSlug: "서울특별시--강남구", sectionSlug: "hospitals" }),
      }),
    ).resolves.toMatchObject({
      title: "강남구 동물병원",
      description: expect.stringContaining("24시 동물병원"),
      alternates: {
        canonical:
          "/towns/%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C--%EA%B0%95%EB%82%A8%EA%B5%AC/hospitals",
      },
    });
  });

  it("links dynamic town sections to category-specific writing templates", async () => {
    const town = buildTownLanding({
      city: "서울특별시",
      district: "강남구",
      counts: { walks: 1 },
    });
    mockGetTownLandingByNeighborhoodSlug.mockResolvedValueOnce(town);

    const html = renderToStaticMarkup(
      await TownSectionPage({
        params: Promise.resolve({ townSlug: "서울특별시--강남구", sectionSlug: "walks" }),
      }),
    );

    expect(html).toContain("산책코스 제보");
    expect(html).toContain("대형견 산책");
    expect(html).toContain(
      "type=WALK_ROUTE&amp;template=walk_route_large_dog&amp;town=%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C+%EA%B0%95%EB%82%A8%EA%B5%AC",
    );
  });

  it("returns noindex metadata for unknown town paths", async () => {
    mockGetTownLandingByNeighborhoodSlug.mockResolvedValue(null);

    await expect(
      generateTownMetadata({ params: Promise.resolve({ townSlug: "old-town" }) }),
    ).resolves.toMatchObject({
      title: "지역 허브를 찾을 수 없습니다",
      robots: { index: false, follow: false },
    });

    await expect(
      generateTownSectionMetadata({
        params: Promise.resolve({ townSlug: "old-town", sectionSlug: "lost" }),
      }),
    ).resolves.toMatchObject({
      title: "지역 정보를 찾을 수 없습니다",
      robots: { index: false, follow: false },
    });
  });

  it("renders not-found for unknown town pages", async () => {
    mockGetTownLandingByNeighborhoodSlug.mockResolvedValue(null);

    await expect(TownPage({ params: Promise.resolve({ townSlug: "old-town" }) })).rejects.toThrow();

    await expect(
      TownSectionPage({
        params: Promise.resolve({ townSlug: "old-town", sectionSlug: "hospitals" }),
      }),
    ).rejects.toThrow();
  });
});
