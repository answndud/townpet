import { PostType } from "@prisma/client";

import { REVIEW_CATEGORY, type ReviewCategory } from "@/lib/review-category";

export type PostCreateTemplateId =
  | "hospital_review"
  | "walk_route_large_dog"
  | "lost_pet"
  | "place_report"
  | "used_market"
  | "local_question";

export type PostCreateTemplate = {
  id: PostCreateTemplateId;
  type: PostType;
  label: string;
  title: string;
  content: string;
  reviewCategory?: ReviewCategory;
  defaults?: PostCreateTemplateDefaults;
};

export type PostCreateTemplateDefaults = {
  reviewCategory?: ReviewCategory;
  animalTagsInput?: string;
  hospitalReview?: Partial<{
    visitPurpose: string;
    animalType: string;
    treatmentType: string;
    explanationSatisfaction: string;
    priceLevel: string;
    hasParking: string;
    hasNightCare: string;
    wouldRevisit: string;
  }>;
  walkRoute?: Partial<{
    difficulty: string;
    largeDogFriendly: string;
    crowdedTime: string;
    leashRequiredNote: string;
    hasStreetLights: string;
    hasWasteBags: string;
    hasWaterStation: string;
    cautionNote: string;
    safetyTags: string;
  }>;
  marketListing?: Partial<{
    listingType: string;
    condition: string;
  }>;
  lostFound?: Partial<{
    alertType: string;
    petType: string;
    breed: string;
    lastSeenLocation: string;
  }>;
};

function withTown(template: string, townLabel?: string) {
  const town = townLabel?.trim() || "우리 동네";
  return template.replaceAll("{town}", town);
}

export function buildPostCreateTemplates(townLabel?: string): PostCreateTemplate[] {
  return [
    {
      id: "hospital_review",
      type: PostType.HOSPITAL_REVIEW,
      label: "병원 경험",
      title: withTown("{town} 병원 방문 경험 공유해요", townLabel),
      content: [
        "방문 전 확인한 정보:",
        "방문 목적: 예방접종 / 중성화 / 피부 / 치과 / 응급 / 건강검진",
        "대기 시간과 설명 방식:",
        "가격대 느낌과 영수증 인증 여부:",
        "다시 방문할지와 이유:",
        "정정이 필요한 공개 정보:",
      ].join("\n"),
      defaults: {
        animalTagsInput: "강아지, 고양이",
        hospitalReview: {
          visitPurpose: "건강 검진",
          animalType: "강아지",
          explanationSatisfaction: "NORMAL",
          priceLevel: "UNKNOWN",
          hasParking: "",
          hasNightCare: "",
          wouldRevisit: "",
        },
      },
    },
    {
      id: "walk_route_large_dog",
      type: PostType.WALK_ROUTE,
      label: "산책코스",
      title: withTown("{town} 산책코스 제보해요", townLabel),
      content: [
        "시작/끝 지점:",
        "혼잡한 시간대:",
        "대형견/소형견 이용 느낌:",
        "목줄 필수 구간:",
        "물 마실 곳/배변봉투함:",
        "야간 조명/주차:",
        "주의할 위험 구간:",
      ].join("\n"),
      defaults: {
        animalTagsInput: "강아지",
        walkRoute: {
          difficulty: "EASY",
          largeDogFriendly: "true",
          crowdedTime: "주말 오후",
          leashRequiredNote: "목줄 필수",
          hasStreetLights: "false",
          hasWasteBags: "false",
          hasWaterStation: "false",
          safetyTags: "목줄, 배변봉투, 혼잡시간",
        },
      },
    },
    {
      id: "lost_pet",
      type: PostType.LOST_FOUND,
      label: "분실/목격",
      title: withTown("{town}에서 반려동물을 찾고 있어요", townLabel),
      content: [
        "상황: 분실 / 목격",
        "사진:",
        "마지막으로 본 위치:",
        "마지막으로 본 시간:",
        "동물 종류와 특징:",
        "목격자가 댓글에 남겨주면 좋은 정보: 위치, 시간, 이동 방향",
        "공개하지 말아야 할 정보: 전화번호, 집 주소 전체, 오픈채팅 링크",
      ].join("\n"),
      defaults: {
        animalTagsInput: "강아지, 고양이",
        lostFound: {
          alertType: "LOST",
          petType: "강아지",
          lastSeenLocation: withTown("{town}", townLabel),
        },
      },
    },
    {
      id: "place_report",
      type: PostType.PRODUCT_REVIEW,
      label: "동반 장소",
      title: withTown("{town} 반려동물 동반 가능 장소 제보해요", townLabel),
      content: [
        "장소 이름:",
        "방문 시간대:",
        "동반 가능 조건:",
        "실내/실외 여부:",
        "주의할 점:",
      ].join("\n"),
      reviewCategory: REVIEW_CATEGORY.PLACE,
      defaults: {
        reviewCategory: REVIEW_CATEGORY.PLACE,
      },
    },
    {
      id: "used_market",
      type: PostType.MARKET_LISTING,
      label: "중고거래",
      title: withTown("{town} 반려용품 거래해요", townLabel),
      content: [
        "제품명:",
        "사용 기간:",
        "개봉 여부/유통기한(사료·간식일 때):",
        "사이즈/체중 기준(이동장·하네스·옷일 때):",
        "상태와 구성품/하자:",
        "위생 세척/작동 확인:",
        "거래 희망 장소:",
      ].join("\n"),
      defaults: {
        animalTagsInput: "강아지, 고양이",
        marketListing: {
          listingType: "SELL",
          condition: "GOOD",
        },
      },
    },
    {
      id: "local_question",
      type: PostType.QA_QUESTION,
      label: "동네 질문",
      title: withTown("{town} 반려생활 정보 질문해요", townLabel),
      content: [
        "찾는 정보: 병원 / 산책 / 미용 / 돌봄 / 이동",
        "반려동물 상황:",
        "이동 가능한 범위:",
        "이미 확인한 곳:",
        "답변받고 싶은 기준:",
      ].join("\n"),
      defaults: {
        animalTagsInput: "강아지, 고양이",
      },
    },
  ];
}

export function getPostCreateTemplateById(id: string | undefined, townLabel?: string) {
  if (!id) {
    return null;
  }
  return buildPostCreateTemplates(townLabel).find((template) => template.id === id) ?? null;
}

export function listPostCreateTemplatesByType(type: PostType, townLabel?: string) {
  return buildPostCreateTemplates(townLabel).filter((template) => template.type === type);
}

export function buildPostCreateTemplateHref({
  templateId,
  townLabel,
  type,
}: {
  templateId: PostCreateTemplateId;
  townLabel?: string;
  type: PostType;
}) {
  const params = new URLSearchParams({
    type,
    template: templateId,
  });
  const normalizedTown = townLabel?.trim();
  if (normalizedTown) {
    params.set("town", normalizedTown);
  }
  return `/posts/new?${params.toString()}`;
}
