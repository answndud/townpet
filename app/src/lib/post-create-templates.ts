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
        "방문 목적:",
        "대기 시간:",
        "설명 방식:",
        "비용 느낌:",
        "다시 방문할지:",
      ].join("\n"),
    },
    {
      id: "walk_route_large_dog",
      type: PostType.WALK_ROUTE,
      label: "산책코스",
      title: withTown("{town} 대형견 산책하기 좋은 곳 있나요?", townLabel),
      content: [
        "추천하거나 찾는 산책 구간:",
        "혼잡한 시간대:",
        "목줄 주의 구간:",
        "물 마실 곳/배변봉투함:",
        "주의할 점:",
      ].join("\n"),
    },
    {
      id: "lost_pet",
      type: PostType.LOST_FOUND,
      label: "분실/목격",
      title: withTown("{town}에서 반려동물을 찾고 있어요", townLabel),
      content: [
        "마지막으로 본 위치:",
        "마지막으로 본 시간:",
        "동물 종류와 특징:",
        "사진 여부:",
        "제보받을 때 확인할 점:",
      ].join("\n"),
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
    },
    {
      id: "used_market",
      type: PostType.MARKET_LISTING,
      label: "중고거래",
      title: "사용감 적은 반려용품 거래해요",
      content: [
        "제품명:",
        "사용 기간:",
        "상태와 구성품:",
        "거래 희망 방식:",
        "위생/작동 확인:",
      ].join("\n"),
    },
    {
      id: "local_question",
      type: PostType.QA_QUESTION,
      label: "동네 질문",
      title: withTown("{town} 고양이 건강검진 병원 추천받아요", townLabel),
      content: [
        "찾는 정보:",
        "반려동물 상황:",
        "이동 가능한 범위:",
        "이미 확인한 곳:",
      ].join("\n"),
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
