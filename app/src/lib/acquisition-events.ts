export const ACQUISITION_EVENT_VALUES = [
  "LANDING_VIEWED",
  "FEED_CTA_CLICKED",
  "ONBOARDING_CTA_CLICKED",
  "CAMPAIGN_VIEWED",
  "CAMPAIGN_CTA_CLICKED",
  "GUIDE_VIEWED",
  "GUIDE_CTA_CLICKED",
  "TOWN_LANDING_VIEWED",
  "TOWN_CATEGORY_CLICKED",
  "TOWN_SECTION_VIEWED",
  "WRITE_TEMPLATE_OPENED",
  "LOST_ALERT_CREATED",
  "LOST_POSTER_GENERATED",
  "LOST_SIGHTING_CREATED",
  "KAKAO_SHARE_CLICKED",
  "OPERATOR_CONTENT_VIEWED",
  "CORRECTION_FLOW_VIEWED",
  "CORRECTION_REQUEST_SUBMITTED",
  "CORRECTION_RECEIPT_CTA_CLICKED",
  "FOUNDING_MEMBER_JOINED",
] as const;

export const ACQUISITION_SURFACE_VALUES = [
  "HOME",
  "CAMPAIGN_NEIGHBORHOOD_MAP",
  "GUIDE",
  "TOWN_LANDING",
  "TOWN_SECTION",
  "POST_CREATE",
  "LOST_FLOW",
  "SHARE_PANEL",
  "CORRECTION_FLOW",
  "ADMIN_OPS",
] as const;

export const ACQUISITION_TARGET_TYPE_VALUES = [
  "NONE",
  "CTA",
  "CAMPAIGN",
  "GUIDE",
  "TOWN",
  "TOWN_SECTION",
  "POST_TYPE",
  "TEMPLATE",
  "POST",
  "CHANNEL",
] as const;

export type AcquisitionEventValue = (typeof ACQUISITION_EVENT_VALUES)[number];
export type AcquisitionSurfaceValue = (typeof ACQUISITION_SURFACE_VALUES)[number];
export type AcquisitionTargetTypeValue =
  (typeof ACQUISITION_TARGET_TYPE_VALUES)[number];

export type AcquisitionEventInput = {
  event: AcquisitionEventValue;
  surface: AcquisitionSurfaceValue;
  targetType?: AcquisitionTargetTypeValue;
  targetId?: string | null;
  source?: string | null;
};

export const ACQUISITION_EVENT_LABELS: Record<AcquisitionEventValue, string> = {
  LANDING_VIEWED: "홈 랜딩 조회",
  FEED_CTA_CLICKED: "피드 CTA 클릭",
  ONBOARDING_CTA_CLICKED: "동네 설정 CTA 클릭",
  CAMPAIGN_VIEWED: "캠페인 조회",
  CAMPAIGN_CTA_CLICKED: "캠페인 CTA 클릭",
  GUIDE_VIEWED: "가이드 조회",
  GUIDE_CTA_CLICKED: "가이드 CTA 클릭",
  TOWN_LANDING_VIEWED: "지역 허브 조회",
  TOWN_CATEGORY_CLICKED: "지역 카테고리 클릭",
  TOWN_SECTION_VIEWED: "지역 섹션 조회",
  WRITE_TEMPLATE_OPENED: "글쓰기 템플릿 진입",
  LOST_ALERT_CREATED: "분실동물 글 생성",
  LOST_POSTER_GENERATED: "분실 포스터 생성",
  LOST_SIGHTING_CREATED: "목격 제보 생성",
  KAKAO_SHARE_CLICKED: "카카오 공유 클릭",
  OPERATOR_CONTENT_VIEWED: "운영자 콘텐츠 조회",
  CORRECTION_FLOW_VIEWED: "정보 정정 요청 화면 조회",
  CORRECTION_REQUEST_SUBMITTED: "정보 정정 요청 제출",
  CORRECTION_RECEIPT_CTA_CLICKED: "정보 정정 접수 후 CTA 클릭",
  FOUNDING_MEMBER_JOINED: "창립 멤버 참여",
};

export function normalizeAcquisitionDimension(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized.slice(0, 96) : "NONE";
}
