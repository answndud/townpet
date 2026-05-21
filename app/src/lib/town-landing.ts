import { LAUNCH_REGION } from "@/lib/launch-region";

export type TownLandingSectionSlug = "hospitals" | "walks" | "lost" | "used-market";

export type TownLandingSection = {
  slug: TownLandingSectionSlug;
  title: string;
  shortTitle: string;
  description: string;
  href: string;
  feedHref: string;
  emptyState: string;
  checklist: string[];
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

export const TOWN_LANDING: TownLanding = {
  slug: LAUNCH_REGION.slug,
  label: LAUNCH_REGION.label,
  district: LAUNCH_REGION.district,
  headline: `${LAUNCH_REGION.district} 반려생활 지도`,
  description:
    "동물병원, 산책코스, 분실/목격 제보, 중고거래 정보를 한 지역에 먼저 모아 검색 가능한 동네 반려생활 정보를 만듭니다.",
  href: `/towns/${LAUNCH_REGION.slug}`,
  sections: [
    {
      slug: "hospitals",
      title: `${LAUNCH_REGION.district} 동물병원 정보`,
      shortTitle: "동물병원",
      description:
        "방문 목적, 대기시간, 설명 충분성, 야간 진료 여부를 경험 공유 중심으로 모읍니다.",
      href: `/towns/${LAUNCH_REGION.slug}/hospitals`,
      feedHref: "/feed/guest?type=HOSPITAL_REVIEW",
      emptyState: "아직 운영자가 정리한 병원 정보와 사용자 후기가 충분하지 않습니다.",
      checklist: ["방문 전 전화 확인", "경험 공유 중심", "정정 요청 가능"],
    },
    {
      slug: "walks",
      title: `${LAUNCH_REGION.district} 산책코스`,
      shortTitle: "산책코스",
      description:
        "목줄 필수 구간, 혼잡 시간, 배변봉투함, 야간 조명 같은 실제 산책 정보를 모읍니다.",
      href: `/towns/${LAUNCH_REGION.slug}/walks`,
      feedHref: "/feed/guest?type=WALK_ROUTE",
      emptyState: "아직 산책코스 제보가 충분하지 않습니다.",
      checklist: ["대형견 적합 여부", "혼잡 시간", "펫티켓 주의 구간"],
    },
    {
      slug: "lost",
      title: `${LAUNCH_REGION.district} 분실/목격 제보`,
      shortTitle: "분실/목격",
      description:
        "실종 위치, 시간, 외형 특징, 목격 댓글을 구조화해 빠르게 공유할 수 있게 합니다.",
      href: `/towns/${LAUNCH_REGION.slug}/lost`,
      feedHref: "/feed/guest?type=LOST_FOUND",
      emptyState: "최근 등록된 분실/목격 제보가 없습니다.",
      checklist: ["실종 시간", "마지막 목격 위치", "공개 연락 방식 제한"],
    },
    {
      slug: "used-market",
      title: `${LAUNCH_REGION.district} 반려용품 중고거래`,
      shortTitle: "중고거래",
      description:
        "사료, 이동장, 유모차, 자동급식기처럼 반려용품 특화 거래 주의사항을 함께 봅니다.",
      href: `/towns/${LAUNCH_REGION.slug}/used-market`,
      feedHref: "/feed/guest?type=MARKET_LISTING",
      emptyState: "아직 지역 중고거래 글이 충분하지 않습니다.",
      checklist: ["개봉 사료 주의", "사이즈 확인", "직거래 장소 확인"],
    },
  ],
};

export function getTownLandingBySlug(slug: string) {
  return slug === TOWN_LANDING.slug ? TOWN_LANDING : null;
}

export function getTownLandingSection(slug: string, sectionSlug: string) {
  const town = getTownLandingBySlug(slug);
  if (!town) {
    return null;
  }
  const section = town.sections.find((item) => item.slug === sectionSlug);
  return section ? { town, section } : null;
}

export function listTownLandingPaths() {
  return [
    TOWN_LANDING.href,
    ...TOWN_LANDING.sections.map((section) => section.href),
  ];
}
