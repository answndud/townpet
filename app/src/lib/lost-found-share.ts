import type { PostType } from "@prisma/client";

import { buildPostContentExcerpt } from "@/lib/post-content-text";
import { toAbsoluteUrl } from "@/lib/site-url";

type LostFoundAlertLike = {
  alertType?: string | null;
  petType?: string | null;
  breed?: string | null;
  lastSeenAt?: string | Date | null;
  lastSeenLocation?: string | null;
  status?: string | null;
};

type LostFoundSharePostLike = {
  id: string;
  type: PostType;
  title: string;
  content: string;
  lostFoundAlert?: LostFoundAlertLike | null;
  neighborhood?: { city?: string | null; name?: string | null; district?: string | null } | null;
};

export function getLostFoundAlertTypeLabel(alertType?: string | null) {
  return alertType === "FOUND" ? "목격/보호" : "실종";
}

export function getLostFoundStatusLabel(status?: string | null) {
  if (status === "RESOLVED") {
    return "해결됨";
  }

  if (status === "CLOSED") {
    return "종료";
  }

  return "제보 접수 중";
}

export function formatLostFoundShareDate(value?: string | Date | null) {
  if (!value) {
    return "시간 미확인";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "시간 미확인";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function buildLostFoundShareTitle(post: LostFoundSharePostLike) {
  const alert = post.lostFoundAlert;
  const alertLabel = getLostFoundAlertTypeLabel(alert?.alertType);
  const petType = alert?.petType?.trim() || "반려동물";
  return `[TownPet] 우리 동네 ${alertLabel} ${petType} 제보 요청`;
}

export function buildLostFoundGuestPostUrl(postId: string) {
  return toAbsoluteUrl(`/posts/${postId}/guest`);
}

export function buildLostFoundShareSummary(post: LostFoundSharePostLike) {
  const alert = post.lostFoundAlert;
  return [
    getLostFoundAlertTypeLabel(alert?.alertType),
    getLostFoundStatusLabel(alert?.status),
    alert?.petType?.trim() || "반려동물",
    alert?.breed?.trim() || null,
    alert?.lastSeenLocation?.trim() || "위치 미확인",
    formatLostFoundShareDate(alert?.lastSeenAt),
  ].filter((part): part is string => Boolean(part));
}

export function buildLostFoundShareText(post: LostFoundSharePostLike) {
  const alert = post.lostFoundAlert;
  const location = alert?.lastSeenLocation?.trim() || "위치 미확인";
  const statusLabel = getLostFoundStatusLabel(alert?.status);
  const lines = [
    buildLostFoundShareTitle(post),
    "",
    `게시글: ${post.title}`,
    `상태: ${statusLabel}`,
    `동물: ${alert?.petType?.trim() || "미확인"}`,
    alert?.breed?.trim() ? `특징: ${alert.breed.trim()}` : null,
    `마지막 확인: ${formatLostFoundShareDate(alert?.lastSeenAt)}`,
    `위치: ${location}`,
    "",
    "목격자는 TownPet 댓글에 위치와 시간을 함께 남겨 주세요.",
    "집 주소 전체, 전화번호, 오픈채팅 링크는 공개 댓글에 남기지 마세요.",
    `제보 링크: ${buildLostFoundGuestPostUrl(post.id)}`,
  ];

  return lines.filter((line): line is string => Boolean(line)).join("\n");
}

export function buildLostFoundShareChecklist(post: LostFoundSharePostLike) {
  const alert = post.lostFoundAlert;
  const alertLabel = getLostFoundAlertTypeLabel(alert?.alertType);
  const petType = alert?.petType?.trim() || "반려동물";
  return [
    `${alertLabel} ${petType} 현재 상태 확인`,
    "마지막 확인 시간과 위치를 함께 공유",
    "목격자는 게시글 댓글로 위치와 시간을 제보",
    "개인 연락처와 집 주소 전체는 공개하지 않기",
  ];
}

export function buildLostFoundPosterUrl(postId: string) {
  return toAbsoluteUrl(`/api/posts/${postId}/lost-found-share.svg`);
}

export function buildLostFoundPosterAlt(post: LostFoundSharePostLike) {
  return `${buildLostFoundShareTitle(post)} 공유 이미지`;
}

export function buildLostFoundMetadataDescription(post: LostFoundSharePostLike) {
  const alert = post.lostFoundAlert;
  const parts = [
    getLostFoundAlertTypeLabel(alert?.alertType),
    getLostFoundStatusLabel(alert?.status),
    alert?.petType,
    alert?.breed,
    alert?.lastSeenLocation,
    formatLostFoundShareDate(alert?.lastSeenAt),
  ]
    .map((part) => part?.trim())
    .filter(Boolean);

  return parts.length > 0
    ? `${parts.join(" · ")}. ${buildPostContentExcerpt(post.content, 80)}`
    : buildPostContentExcerpt(post.content);
}
