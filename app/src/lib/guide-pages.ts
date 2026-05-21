export type GuidePage = {
  slug: string;
  title: string;
  description: string;
  intentLabel: string;
  lead: string;
  primaryCta: {
    label: string;
    href: string;
  };
  secondaryCta?: {
    label: string;
    href: string;
  };
  sections: Array<{
    title: string;
    items: string[];
  }>;
  caution: string;
};

export const GUIDE_PAGES: GuidePage[] = [
  {
    slug: "lost-dog-poster",
    title: "분실동물 전단 만들기 전 확인할 것",
    description:
      "분실동물 전단에 꼭 들어갈 정보와 공개하면 위험한 정보를 구분해 정리합니다.",
    intentLabel: "분실동물",
    lead: "전단은 빠르게 퍼져야 하지만, 보호자 연락처와 위치 정보는 필요한 범위만 공개해야 합니다.",
    primaryCta: {
      label: "분실/목격 게시판 보기",
      href: "/feed/guest?type=LOST_FOUND",
    },
    secondaryCta: {
      label: "분실 글 작성하기",
      href: "/posts/new?type=LOST_FOUND",
    },
    sections: [
      {
        title: "먼저 넣을 정보",
        items: [
          "동물 종류, 이름, 나이, 성별, 중성화 여부처럼 식별에 필요한 기본 정보를 적습니다.",
          "마지막으로 본 장소와 시간을 가능한 구체적으로 적되, 집 주소 전체는 공개하지 않습니다.",
          "정면 사진, 전신 사진, 특징이 보이는 사진을 함께 준비합니다.",
        ],
      },
      {
        title: "연락 방식",
        items: [
          "개인 전화번호를 공개해야 한다면 임시 연락 수단이나 별도 연락 가능 시간을 함께 적습니다.",
          "제보자는 발견 위치, 시간, 사진 여부를 먼저 남기게 안내합니다.",
          "보호자 확인 질문을 준비해 무관한 연락과 악용 가능성을 줄입니다.",
        ],
      },
      {
        title: "게시 전 점검",
        items: [
          "보상금 표현은 오해를 만들 수 있으니 신중하게 적고, 무리한 현장 이동 요청은 피합니다.",
          "동물병원, 보호센터, 지자체 공고 확인을 함께 진행합니다.",
          "찾은 뒤에는 게시글 제목이나 본문에 찾았다는 상태를 남겨 중복 제보를 줄입니다.",
        ],
      },
    ],
    caution:
      "TownPet 글은 제보를 돕는 정보 공유입니다. 구조, 치료, 보호 조치는 현장 상황과 공공기관 안내를 우선하세요.",
  },
  {
    slug: "24h-vet-checklist",
    title: "24시 동물병원 찾기 전 확인할 것",
    description:
      "야간이나 휴일에 동물병원을 찾기 전 전화로 확인해야 할 항목을 정리합니다.",
    intentLabel: "동물병원",
    lead: "응급 상황에서는 가까운 병원보다 지금 진료 가능한 병원인지 먼저 확인해야 합니다.",
    primaryCta: {
      label: "병원 후기 게시판 보기",
      href: "/feed/guest?type=HOSPITAL_REVIEW",
    },
    secondaryCta: {
      label: "병원 정보 공유하기",
      href: "/posts/new?type=HOSPITAL_REVIEW",
    },
    sections: [
      {
        title: "전화로 확인할 것",
        items: [
          "현재 진료 가능 여부, 야간 진료 접수 마감, 대기 시간을 먼저 확인합니다.",
          "필요한 진료과나 장비가 있는지 묻습니다. 예: 영상 검사, 입원, 수술 가능 여부.",
          "초진 접수, 보호자 신분 확인, 예상 결제 방식 같은 방문 조건을 확인합니다.",
        ],
      },
      {
        title: "이동 전 준비",
        items: [
          "증상 시작 시간, 먹은 것, 복용 중인 약, 기존 진료 기록을 짧게 정리합니다.",
          "이동 중 악화될 수 있는 상태라면 병원 안내를 받은 뒤 이동합니다.",
          "주차, 야간 출입구, 보호자 동행 가능 여부를 확인합니다.",
        ],
      },
      {
        title: "후기 작성 기준",
        items: [
          "의료 결과를 단정하지 말고, 방문 시간, 접수 경험, 설명 방식처럼 경험 중심으로 적습니다.",
          "수의사나 직원 실명, 다른 보호자 정보는 공개하지 않습니다.",
          "비용은 상황에 따라 달라질 수 있음을 함께 적습니다.",
        ],
      },
    ],
    caution:
      "이 가이드는 병원 선택 전 확인 목록입니다. 진단과 치료 판단은 수의사와 병원의 안내를 따르세요.",
  },
  {
    slug: "pet-used-trade-safety",
    title: "반려동물 중고용품 거래 안전 체크",
    description:
      "이동장, 급식기, 장난감 같은 반려동물 중고용품 거래 전 확인할 안전 기준을 정리합니다.",
    intentLabel: "중고거래",
    lead: "반려동물 용품은 상태뿐 아니라 위생, 리콜, 크기, 소모품 여부까지 확인해야 합니다.",
    primaryCta: {
      label: "중고거래 글 보기",
      href: "/feed/guest?type=MARKET_LISTING",
    },
    secondaryCta: {
      label: "중고거래 글 작성하기",
      href: "/posts/new?type=MARKET_LISTING",
    },
    sections: [
      {
        title: "사진으로 확인할 것",
        items: [
          "제품 전체, 사용감이 있는 부분, 구성품, 모델명 라벨 사진을 요청합니다.",
          "급식기나 정수기는 내부 물때, 필터 교체 주기, 세척 가능 부위를 확인합니다.",
          "이동장, 유모차, 하네스는 잠금장치와 파손 여부를 따로 확인합니다.",
        ],
      },
      {
        title: "거래 전 질문",
        items: [
          "사용 기간, 보관 상태, 반려동물 질병 이력과 직접 접촉 여부를 묻습니다.",
          "소모품 재구매 가능 여부와 제조사 리콜 또는 안전 공지를 확인합니다.",
          "전자제품은 작동 영상과 전원 케이블 상태를 확인합니다.",
        ],
      },
      {
        title: "만남과 결제",
        items: [
          "첫 거래는 공개된 장소에서 진행하고, 고가 제품은 현장 확인 후 결제합니다.",
          "택배 거래는 구성품 누락과 파손 책임 기준을 사전에 정합니다.",
          "반려동물 생체 거래나 불법 분양으로 이어지는 글은 신고합니다.",
        ],
      },
    ],
    caution:
      "TownPet은 중고용품 정보 공유를 돕지만 거래 당사자가 아닙니다. 의심스러운 거래는 결제 전 중단하고 신고하세요.",
  },
  {
    slug: "lost-pet-first-24-hours",
    title: "반려동물을 잃어버린 첫 24시간",
    description:
      "분실 직후 보호자가 확인해야 할 동선, 신고, 온라인 게시 순서를 정리합니다.",
    intentLabel: "분실동물",
    lead: "처음 24시간은 같은 정보를 여러 곳에 정확히 공유하고, 확인한 장소를 기록하는 시간이 중요합니다.",
    primaryCta: {
      label: "분실/목격 게시판 보기",
      href: "/feed/guest?type=LOST_FOUND",
    },
    secondaryCta: {
      label: "분실 글 작성하기",
      href: "/posts/new?type=LOST_FOUND",
    },
    sections: [
      {
        title: "바로 확인할 장소",
        items: [
          "마지막 목격 지점 주변 출입구, 주차장, 계단, 화단처럼 숨기 쉬운 곳부터 확인합니다.",
          "산책 경로, 자주 가던 가게, 동물병원 주변을 시간대별로 나눠 확인합니다.",
          "확인한 장소와 시간을 기록해 같은 곳만 반복해서 찾는 일을 줄입니다.",
        ],
      },
      {
        title: "공유와 신고",
        items: [
          "사진, 특징, 마지막 목격 장소, 연락 방법을 같은 형식으로 정리합니다.",
          "지자체 동물보호센터, 유실동물 공고, 인근 동물병원에 확인합니다.",
          "온라인 게시글은 찾은 뒤 상태 변경이 가능하도록 본인이 관리할 수 있는 곳에 올립니다.",
        ],
      },
      {
        title: "제보 관리",
        items: [
          "제보 받은 시간, 위치, 사진 여부를 표로 정리합니다.",
          "보호자 확인 질문 없이 동물을 넘겨받거나 이동시키지 않도록 안내합니다.",
          "확인되지 않은 제보는 단정해서 공유하지 않습니다.",
        ],
      },
    ],
    caution:
      "분실 대응은 지역 상황에 따라 달라집니다. 공공기관 공고와 현장 안전을 우선하고, 혼자 무리한 수색은 피하세요.",
  },
  {
    slug: "pet-hospital-review-policy",
    title: "동물병원 후기를 안전하게 남기는 방법",
    description:
      "병원 후기를 경험 중심으로 남기고 개인정보와 의료 단정을 피하는 기준을 정리합니다.",
    intentLabel: "후기 작성",
    lead: "좋은 후기는 평가보다 맥락입니다. 방문 목적, 접수 경험, 설명 방식, 재방문 기준이 다른 보호자에게 도움이 됩니다.",
    primaryCta: {
      label: "병원 후기 보기",
      href: "/feed/guest?type=HOSPITAL_REVIEW",
    },
    secondaryCta: {
      label: "병원 후기 작성하기",
      href: "/posts/new?type=HOSPITAL_REVIEW",
    },
    sections: [
      {
        title: "도움 되는 후기",
        items: [
          "방문 시간대, 예약 여부, 대기 시간, 설명 방식처럼 다른 보호자가 준비할 수 있는 정보를 적습니다.",
          "진료비는 항목과 상황에 따라 달라질 수 있음을 함께 적습니다.",
          "응급, 예방접종, 피부, 치과처럼 방문 목적을 분명히 적습니다.",
        ],
      },
      {
        title: "피해야 할 표현",
        items: [
          "치료 결과를 일반화하거나 특정 처치가 항상 맞다고 단정하지 않습니다.",
          "수의사, 직원, 다른 보호자의 실명과 연락처를 공개하지 않습니다.",
          "분쟁 중인 내용은 감정 표현보다 확인 가능한 사실 위주로 정리합니다.",
        ],
      },
      {
        title: "수정과 신고",
        items: [
          "새 정보가 생기면 제목보다 본문에 업데이트 시점을 남깁니다.",
          "개인정보, 허위 정보, 광고성 후기는 신고 대상이 될 수 있습니다.",
          "직접 겪지 않은 이야기는 후기로 쓰지 않습니다.",
        ],
      },
    ],
    caution:
      "후기는 의료 조언이 아니라 방문 경험 공유입니다. 진료 판단은 담당 수의사와 병원 안내를 따르세요.",
  },
];

export function listGuidePages() {
  return GUIDE_PAGES;
}

export function listGuidePaths() {
  return GUIDE_PAGES.map((guide) => `/guides/${guide.slug}`);
}

export function getGuidePageBySlug(slug: string) {
  return GUIDE_PAGES.find((guide) => guide.slug === slug) ?? null;
}
