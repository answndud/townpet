import { PostType } from "@prisma/client";

import {
  buildPostCreateTemplateHref,
  type PostCreateTemplateId,
} from "@/lib/post-create-templates";

export type TownLandingSectionSlug = "hospitals" | "walks" | "lost" | "used-market";

export type TownLandingSection = {
  slug: TownLandingSectionSlug;
  title: string;
  shortTitle: string;
  description: string;
  href: string;
  feedHref: string;
  writeHref: string;
  emptyState: string;
  checklist: string[];
  count?: number;
};

export type TownLanding = {
  slug: string;
  label: string;
  district: string;
  headline: string;
  description: string;
  href: string;
  sections: TownLandingSection[];
};

export const TOWN_LANDING_SECTION_TEMPLATES = [
  {
    slug: "hospitals",
    shortTitle: "동물병원",
    feedHref: "/feed/guest?type=HOSPITAL_REVIEW",
    postType: PostType.HOSPITAL_REVIEW,
    templateId: "hospital_review",
    emptyState: "아직 이 지역의 병원 후기와 운영자 정리 정보가 충분하지 않습니다.",
    checklist: ["방문 전 전화 확인", "경험 공유 중심", "정정 요청 가능"],
  },
  {
    slug: "walks",
    shortTitle: "산책코스",
    feedHref: "/feed/guest?type=WALK_ROUTE",
    postType: PostType.WALK_ROUTE,
    templateId: "walk_route_large_dog",
    emptyState: "아직 이 지역의 산책코스 제보가 충분하지 않습니다.",
    checklist: ["대형견 적합 여부", "혼잡 시간", "펫티켓 주의 구간"],
  },
  {
    slug: "lost",
    shortTitle: "분실/목격",
    feedHref: "/feed/guest?type=LOST_FOUND",
    postType: PostType.LOST_FOUND,
    templateId: "lost_pet",
    emptyState: "최근 이 지역에 등록된 분실/목격 제보가 없습니다.",
    checklist: ["실종 시간", "마지막 목격 위치", "공개 연락 방식 제한"],
  },
  {
    slug: "used-market",
    shortTitle: "중고거래",
    feedHref: "/feed/guest?type=MARKET_LISTING",
    postType: PostType.MARKET_LISTING,
    templateId: "used_market",
    emptyState: "아직 이 지역의 반려용품 중고거래 글이 충분하지 않습니다.",
    checklist: ["개봉 사료 주의", "사이즈 확인", "직거래 장소 확인"],
  },
] as const satisfies ReadonlyArray<
  Pick<TownLandingSection, "slug" | "shortTitle" | "feedHref" | "emptyState" | "checklist"> & {
    postType: PostType;
    templateId: PostCreateTemplateId;
  }
>;

export function buildTownSlug(city: string, district: string) {
  const normalizedCity = city.trim();
  const normalizedDistrict = district.trim();
  if (!normalizedCity || !normalizedDistrict) {
    return "";
  }
  return `${normalizedCity}--${normalizedDistrict}`;
}

export function parseTownSlug(slug: string) {
  const decoded = decodeURIComponent(slug).trim();
  const [city, district, ...rest] = decoded.split("--");
  if (!city || !district || rest.length > 0) {
    return null;
  }
  return { city, district };
}

export function buildTownLanding({
  city,
  district,
  counts = {},
}: {
  city: string;
  district: string;
  counts?: Partial<Record<TownLandingSectionSlug, number>>;
}): TownLanding | null {
  const slug = buildTownSlug(city, district);
  if (!slug) {
    return null;
  }
  const label = `${city} ${district}`;
  const href = `/towns/${encodeURIComponent(slug)}`;

  return {
    slug,
    label,
    district,
    headline: `${district} 반려생활 허브`,
    description:
      "사용자가 선택한 동네를 기준으로 병원 후기, 산책코스, 분실/목격 제보, 중고거래 정보를 모아봅니다.",
    href,
    sections: TOWN_LANDING_SECTION_TEMPLATES.map((template) => ({
      ...template,
      title: `${district} ${template.shortTitle}`,
      description: buildSectionDescription(template.slug),
      href: `${href}/${template.slug}`,
      writeHref: buildPostCreateTemplateHref({
        templateId: template.templateId,
        townLabel: label,
        type: template.postType,
      }),
      count: counts[template.slug] ?? 0,
    })),
  };
}

export const TOWN_LANDINGS: TownLanding[] = [];

export function getTownLandingBySlug(slug: string) {
  return TOWN_LANDINGS.find((town) => town.slug === slug) ?? null;
}

export function getTownLandingSection(town: TownLanding, sectionSlug: string) {
  const section = town.sections.find((item) => item.slug === sectionSlug);
  return section ? { town, section } : null;
}

export function listTownLandingPaths() {
  return TOWN_LANDINGS.flatMap((town) => [
    town.href,
    ...town.sections.map((section) => section.href),
  ]);
}

function buildSectionDescription(slug: TownLandingSectionSlug) {
  switch (slug) {
    case "hospitals":
      return "방문 목적, 대기시간, 설명 충분성, 야간 진료 여부를 경험 공유 중심으로 모읍니다.";
    case "walks":
      return "목줄 필수 구간, 혼잡 시간, 배변봉투함, 야간 조명 같은 실제 산책 정보를 모읍니다.";
    case "lost":
      return "실종 위치, 시간, 외형 특징, 목격 댓글을 구조화해 빠르게 공유할 수 있게 합니다.";
    case "used-market":
      return "사료, 이동장, 유모차, 자동급식기처럼 반려용품 특화 거래 주의사항을 함께 봅니다.";
  }
}
