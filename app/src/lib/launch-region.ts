export type LaunchRegionCandidate = {
  slug: string;
  label: string;
  reason: string;
};

export type LaunchRegionPriorityLink = {
  label: string;
  href: string;
  description: string;
};

export type LaunchRegion = {
  slug: string;
  city: string;
  district: string;
  neighborhood: string;
  label: string;
  headline: string;
  description: string;
  selectionHref: string;
  campaignHref: string;
  priorityLinks: LaunchRegionPriorityLink[];
  candidates: LaunchRegionCandidate[];
};

export const LAUNCH_REGION: LaunchRegion = {
  slug: "mapo",
  city: "서울특별시",
  district: "마포구",
  neighborhood: "연남동",
  label: "서울 마포구",
  headline: "지금은 마포구부터 만들고 있어요",
  description:
    "초기 90일은 마포구의 병원 후기, 산책코스, 분실/목격 제보를 먼저 모아 동네 정보 밀도를 높입니다.",
  selectionHref: "/onboarding",
  campaignHref: "/feed/guest?type=LOST_FOUND",
  priorityLinks: [
    {
      label: "분실/목격",
      href: "/feed/guest?type=LOST_FOUND",
      description: "실종 위치, 특징, 목격 제보를 빠르게 공유합니다.",
    },
    {
      label: "동물병원",
      href: "/feed/guest?type=HOSPITAL_REVIEW",
      description: "방문 목적과 대기시간, 설명 충분성을 함께 봅니다.",
    },
    {
      label: "산책코스",
      href: "/feed/guest?type=WALK_ROUTE",
      description: "동네 산책 경로와 동반 가능 장소를 모읍니다.",
    },
  ],
  candidates: [
    {
      slug: "seongdong",
      label: "서울 성동구",
      reason: "성수동 중심 동반 장소와 산책 수요",
    },
    {
      slug: "songpa",
      label: "서울 송파구",
      reason: "공원, 산책, 병원 탐색 수요",
    },
    {
      slug: "bundang",
      label: "경기 성남 분당",
      reason: "지역 커뮤니티와 반려 지출 여력",
    },
  ],
};
