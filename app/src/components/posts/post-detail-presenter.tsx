import {
  CareApplicationStatus,
  CareFeedbackAuthorRole,
  CareFeedbackIssueType,
  CareFeedbackOutcome,
  CareRequestStatus,
  MarketStatus,
  PostType,
} from "@prisma/client";

export const typeMeta: Record<PostType, { label: string; chipClass: string }> = {
  HOSPITAL_REVIEW: {
    label: "병원 후기",
    chipClass: "border-sky-200 bg-sky-50 text-sky-700",
  },
  PLACE_REVIEW: {
    label: "장소 후기",
    chipClass: "border-blue-200 bg-blue-50 text-blue-700",
  },
  WALK_ROUTE: {
    label: "동네 산책코스",
    chipClass: "border-cyan-200 bg-cyan-50 text-cyan-700",
  },
  MEETUP: {
    label: "동네 모임",
    chipClass: "border-indigo-200 bg-indigo-50 text-indigo-700",
  },
  MARKET_LISTING: {
    label: "중고·공동구매",
    chipClass: "border-slate-300 bg-slate-100 text-slate-700",
  },
  CARE_REQUEST: {
    label: "돌봄 요청",
    chipClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  ADOPTION_LISTING: {
    label: "유기동물 입양",
    chipClass: "border-amber-200 bg-amber-50 text-amber-700",
  },
  SHELTER_VOLUNTEER: {
    label: "보호소 봉사 모집",
    chipClass: "border-lime-200 bg-lime-50 text-lime-700",
  },
  LOST_FOUND: {
    label: "실종/목격 제보",
    chipClass: "border-rose-200 bg-rose-50 text-rose-700",
  },
  QA_QUESTION: {
    label: "질문/답변",
    chipClass: "border-teal-200 bg-teal-50 text-teal-700",
  },
  QA_ANSWER: {
    label: "질문/답변",
    chipClass: "border-cyan-200 bg-cyan-50 text-cyan-700",
  },
  FREE_POST: {
    label: "자유게시판",
    chipClass: "border-slate-200 bg-slate-50 text-slate-600",
  },
  FREE_BOARD: {
    label: "자유게시판",
    chipClass: "border-slate-200 bg-slate-50 text-slate-600",
  },
  DAILY_SHARE: {
    label: "자유게시판",
    chipClass: "border-slate-200 bg-slate-50 text-slate-600",
  },
  PRODUCT_REVIEW: {
    label: "용품 후기",
    chipClass: "border-blue-200 bg-blue-50 text-blue-700",
  },
  PET_SHOWCASE: {
    label: "반려동물 자랑",
    chipClass: "border-sky-200 bg-sky-50 text-sky-700",
  },
};

export const emptyValue = <span className="tp-text-placeholder">비어 있음</span>;

export const renderTextValue = (value: string | null | undefined) =>
  value && value.trim().length > 0 ? value : emptyValue;

export const renderNumberValue = (value: number | null | undefined, suffix = "") =>
  value !== null && value !== undefined ? `${value}${suffix}` : emptyValue;

export const formatDetailDateTime = (value: string | Date | null | undefined) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const renderBooleanValue = (
  value: boolean | null | undefined,
  trueLabel: string,
  falseLabel: string,
) => (value === null || value === undefined ? emptyValue : value ? trueLabel : falseLabel);

export const hospitalExplanationLabel: Record<string, string> = {
  ENOUGH: "충분했음",
  NORMAL: "보통",
  LACKING: "부족했음",
  NOT_APPLICABLE: "해당 없음",
};

export const hospitalPriceLevelLabel: Record<string, string> = {
  LOW: "낮게 느껴짐",
  NORMAL: "보통",
  HIGH: "높게 느껴짐",
  UNKNOWN: "판단 어려움",
};

export const adoptionStatusLabel: Record<string, string> = {
  OPEN: "입양 가능",
  RESERVED: "상담 중",
  ADOPTED: "입양 완료",
  CLOSED: "마감",
};

export const animalSexLabel: Record<string, string> = {
  MALE: "수컷",
  FEMALE: "암컷",
  UNKNOWN: "미상",
};

export const volunteerStatusLabel: Record<string, string> = {
  OPEN: "모집 중",
  FULL: "정원 마감",
  CLOSED: "모집 종료",
  CANCELLED: "취소",
};

export const marketTypeLabel: Record<string, string> = {
  SELL: "판매",
  RENT: "대여",
  SHARE: "나눔",
};

export const marketConditionLabel: Record<string, string> = {
  NEW: "새상품",
  LIKE_NEW: "거의 새것",
  GOOD: "사용감 적음",
  FAIR: "사용감 있음",
};

export const marketStatusLabel: Record<string, string> = {
  AVAILABLE: "거래 가능",
  RESERVED: "예약 중",
  SOLD: "거래 완료",
  CANCELLED: "취소",
};

export const careTypeLabel: Record<string, string> = {
  WALK: "산책",
  FEEDING: "급식",
  VISIT_CARE: "방문 돌봄",
  HOSPITAL_COMPANION: "병원 동행",
  EMERGENCY_CHECK: "긴급 체크",
  ERRAND: "심부름",
};

export const routeDifficultyLabel: Record<string, string> = {
  EASY: "쉬움",
  MODERATE: "보통",
  HARD: "어려움",
};

export const careStatusLabel: Record<string, string> = {
  OPEN: "요청 중",
  MATCHED: "매칭됨",
  IN_PROGRESS: "진행 중",
  COMPLETED: "완료",
  CANCELLED: "취소",
};

export const lostFoundAlertTypeLabel: Record<string, string> = {
  LOST: "실종",
  FOUND: "목격/보호",
};

export const lostFoundStatusLabel: Record<string, string> = {
  ACTIVE: "제보 접수 중",
  RESOLVED: "해결됨",
  CLOSED: "종료",
};

export const authorMarketStatusOptions: MarketStatus[] = [
  MarketStatus.AVAILABLE,
  MarketStatus.RESERVED,
  MarketStatus.SOLD,
  MarketStatus.CANCELLED,
];

export const careStatusOptions: CareRequestStatus[] = [
  CareRequestStatus.OPEN,
  CareRequestStatus.MATCHED,
  CareRequestStatus.IN_PROGRESS,
  CareRequestStatus.COMPLETED,
  CareRequestStatus.CANCELLED,
];

export const resolveCareStatusOptions = ({
  currentStatus,
  isAuthor,
  isAcceptedApplicant,
  canModerate,
}: {
  currentStatus?: string | null;
  isAuthor: boolean;
  isAcceptedApplicant: boolean;
  canModerate: boolean;
}) => {
  if (canModerate) {
    return careStatusOptions;
  }

  if (isAuthor) {
    if (currentStatus === CareRequestStatus.OPEN) {
      return [CareRequestStatus.CANCELLED];
    }
    if (currentStatus === CareRequestStatus.MATCHED) {
      return [CareRequestStatus.IN_PROGRESS, CareRequestStatus.CANCELLED];
    }
    if (currentStatus === CareRequestStatus.IN_PROGRESS) {
      return [CareRequestStatus.COMPLETED];
    }
  }

  if (isAcceptedApplicant) {
    if (currentStatus === CareRequestStatus.MATCHED) {
      return [CareRequestStatus.IN_PROGRESS];
    }
    if (currentStatus === CareRequestStatus.IN_PROGRESS) {
      return [CareRequestStatus.COMPLETED];
    }
  }

  return [];
};

export const careApplicationStatusLabel: Record<CareApplicationStatus, string> = {
  PENDING: "대기 중",
  ACCEPTED: "수락",
  DECLINED: "거절",
  CANCELLED: "취소",
};

export const careFeedbackOutcomeLabel: Record<CareFeedbackOutcome, string> = {
  POSITIVE: "좋았어요",
  NEUTRAL: "보통이에요",
  ISSUE: "확인이 필요해요",
};

export const careFeedbackIssueLabel: Record<CareFeedbackIssueType, string> = {
  NONE: "이슈 없음",
  NO_SHOW: "노쇼/불참",
  SAFETY: "안전 우려",
  PAYMENT_OR_FRAUD: "사기/금전 요구",
  PRIVACY: "개인정보 문제",
  OTHER: "기타",
};

export const careFeedbackAuthorRoleLabel: Record<CareFeedbackAuthorRole, string> = {
  REQUESTER: "요청자",
  CAREGIVER: "돌봄 지원자",
};

export function ensureDate(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return new Date(parsed);
  }
  return new Date();
}
