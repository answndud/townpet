import { PostType } from "@prisma/client";

import { NEIGHBORHOOD_MAP_CAMPAIGN_PATH } from "@/lib/campaign-pages";
import {
  buildPostCreateTemplateHref,
  type PostCreateTemplateId,
} from "@/lib/post-create-templates";

export const OFFLINE_PARTNER_UTM_MEDIUM = "offline_qr";
export const OFFLINE_PARTNER_UTM_CAMPAIGN = "neighborhood_map";

export type OfflinePartnerQrSource =
  | "hospital_qr"
  | "petcafe_qr"
  | "grooming_qr"
  | "shelter_qr";

export type OfflinePartnerQrChannel = {
  source: OfflinePartnerQrSource;
  partnerLabel: string;
  qrLabel: string;
  landingHref: string;
  primaryHref: string;
  primaryCta: string;
  promise: string;
  proposalCopy: string;
};

function appendOfflineQrParams(href: string, source: OfflinePartnerQrSource) {
  const [pathname, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("utm_source", source);
  params.set("utm_medium", OFFLINE_PARTNER_UTM_MEDIUM);
  params.set("utm_campaign", OFFLINE_PARTNER_UTM_CAMPAIGN);

  return `${pathname}?${params.toString()}`;
}

function buildTrackedTemplateHref({
  source,
  templateId,
  type,
}: {
  source: OfflinePartnerQrSource;
  templateId: PostCreateTemplateId;
  type: PostType;
}) {
  return appendOfflineQrParams(
    buildPostCreateTemplateHref({
      templateId,
      type,
    }),
    source,
  );
}

export const OFFLINE_PARTNER_QR_CHANNELS: OfflinePartnerQrChannel[] = [
  {
    source: "hospital_qr",
    partnerLabel: "동물병원",
    qrLabel: "응급/야간 병원 체크 QR",
    landingHref: appendOfflineQrParams("/guides/24h-vet-checklist", "hospital_qr"),
    primaryHref: buildTrackedTemplateHref({
      source: "hospital_qr",
      templateId: "hospital_review",
      type: PostType.HOSPITAL_REVIEW,
    }),
    primaryCta: "병원 경험 남기기",
    promise: "보호자가 방문 전 확인할 체크리스트와 동네 병원 경험을 바로 봅니다.",
    proposalCopy:
      "대기실에서 보호자가 야간 진료, 설명 방식, 재방문 경험을 안전하게 남길 수 있게 안내합니다.",
  },
  {
    source: "petcafe_qr",
    partnerLabel: "펫카페",
    qrLabel: "동반가능 장소 제보 QR",
    landingHref: appendOfflineQrParams(NEIGHBORHOOD_MAP_CAMPAIGN_PATH, "petcafe_qr"),
    primaryHref: buildTrackedTemplateHref({
      source: "petcafe_qr",
      templateId: "place_report",
      type: PostType.PRODUCT_REVIEW,
    }),
    primaryCta: "동반 장소 제보하기",
    promise: "방문자가 반려동물 동반 조건, 혼잡 시간, 주의사항을 남깁니다.",
    proposalCopy:
      "매장 안내대 QR로 실제 방문자가 동반 가능 조건과 이용 팁을 짧게 제보하게 합니다.",
  },
  {
    source: "grooming_qr",
    partnerLabel: "미용실",
    qrLabel: "동네 산책/케어 정보 QR",
    landingHref: appendOfflineQrParams(NEIGHBORHOOD_MAP_CAMPAIGN_PATH, "grooming_qr"),
    primaryHref: buildTrackedTemplateHref({
      source: "grooming_qr",
      templateId: "walk_route_large_dog",
      type: PostType.WALK_ROUTE,
    }),
    primaryCta: "산책코스 추천하기",
    promise: "미용 후 주변 산책 코스, 대형견 적합 여부, 혼잡 시간을 공유합니다.",
    proposalCopy:
      "미용 대기 시간에 보호자가 자주 걷는 코스와 주의 구간을 남길 수 있게 제안합니다.",
  },
  {
    source: "shelter_qr",
    partnerLabel: "보호소/입양센터",
    qrLabel: "분실동물 첫 24시간 QR",
    landingHref: appendOfflineQrParams("/guides/lost-pet-first-24-hours", "shelter_qr"),
    primaryHref: appendOfflineQrParams("/lost/new", "shelter_qr"),
    primaryCta: "분실/목격 등록하기",
    promise: "실종 직후 필요한 조치와 목격 제보 등록 흐름으로 바로 연결합니다.",
    proposalCopy:
      "입구와 상담석 QR로 실종 직후 행동 순서와 목격 제보 등록 경로를 안내합니다.",
  },
];

export function listOfflinePartnerQrChannels() {
  return OFFLINE_PARTNER_QR_CHANNELS;
}

export function getOfflinePartnerQrChannelBySource(source: string | null | undefined) {
  return OFFLINE_PARTNER_QR_CHANNELS.find((channel) => channel.source === source) ?? null;
}
