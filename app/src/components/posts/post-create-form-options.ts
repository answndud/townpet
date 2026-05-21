import { PostScope, PostType } from "@prisma/client";

import { REVIEW_CATEGORY, type ReviewCategory } from "@/lib/review-category";

export const postTypeOptions = [
  { value: PostType.FREE_BOARD, label: "자유게시판" },
  { value: PostType.QA_QUESTION, label: "질문/답변" },
  { value: PostType.HOSPITAL_REVIEW, label: "병원 후기" },
  { value: PostType.LOST_FOUND, label: "실종/목격 제보" },
  { value: PostType.MEETUP, label: "동네 모임" },
  { value: PostType.MARKET_LISTING, label: "중고/공동구매" },
  { value: PostType.CARE_REQUEST, label: "돌봄 요청" },
  { value: PostType.ADOPTION_LISTING, label: "유기동물 입양" },
  { value: PostType.SHELTER_VOLUNTEER, label: "보호소 봉사 모집" },
  { value: PostType.PRODUCT_REVIEW, label: "용품 후기" },
  { value: PostType.PET_SHOWCASE, label: "반려동물 자랑" },
] as const;

export function resolveScopeByPostType(type: PostType, scope: PostScope) {
  if (
    type === PostType.HOSPITAL_REVIEW ||
    type === PostType.ADOPTION_LISTING ||
    type === PostType.SHELTER_VOLUNTEER
  ) {
    return PostScope.GLOBAL;
  }
  if (type === PostType.MEETUP || type === PostType.CARE_REQUEST) {
    return PostScope.LOCAL;
  }
  return scope;
}

export const reviewCategoryOptions: Array<{ value: ReviewCategory; label: string }> = [
  { value: REVIEW_CATEGORY.SUPPLIES, label: "용품" },
  { value: REVIEW_CATEGORY.FEED, label: "사료" },
  { value: REVIEW_CATEGORY.SNACK, label: "간식" },
  { value: REVIEW_CATEGORY.TOY, label: "장난감" },
  { value: REVIEW_CATEGORY.PLACE, label: "장소" },
  { value: REVIEW_CATEGORY.ETC, label: "기타" },
];

export const marketListingTypeOptions = [
  { value: "SELL", label: "판매" },
  { value: "RENT", label: "대여" },
  { value: "SHARE", label: "나눔" },
] as const;

export const marketConditionOptions = [
  { value: "NEW", label: "새상품" },
  { value: "LIKE_NEW", label: "거의 새것" },
  { value: "GOOD", label: "사용감 적음" },
  { value: "FAIR", label: "사용감 있음" },
] as const;

export const careTypeOptions = [
  { value: "WALK", label: "산책" },
  { value: "FEEDING", label: "급식" },
  { value: "VISIT_CARE", label: "방문 돌봄" },
  { value: "HOSPITAL_COMPANION", label: "병원 동행" },
  { value: "EMERGENCY_CHECK", label: "긴급 체크" },
  { value: "ERRAND", label: "심부름" },
] as const;

export const lostFoundAlertTypeOptions = [
  { value: "LOST", label: "실종" },
  { value: "FOUND", label: "목격/보호" },
] as const;

export const hospitalVisitPurposeOptions = [
  { value: "건강 검진", label: "건강 검진" },
  { value: "예방 접종", label: "예방 접종" },
  { value: "응급/야간", label: "응급/야간" },
  { value: "수술/시술", label: "수술/시술" },
  { value: "피부/귀/눈", label: "피부/귀/눈" },
  { value: "치과", label: "치과" },
] as const;

export const hospitalExplanationOptions = [
  { value: "", label: "선택 안함" },
  { value: "ENOUGH", label: "충분했음" },
  { value: "NORMAL", label: "보통" },
  { value: "LACKING", label: "부족했음" },
  { value: "NOT_APPLICABLE", label: "해당 없음" },
] as const;

export const hospitalPriceLevelOptions = [
  { value: "", label: "선택 안함" },
  { value: "LOW", label: "낮게 느껴짐" },
  { value: "NORMAL", label: "보통" },
  { value: "HIGH", label: "높게 느껴짐" },
  { value: "UNKNOWN", label: "판단 어려움" },
] as const;
