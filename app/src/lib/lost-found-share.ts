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

export function buildLostFoundShareText(post: LostFoundSharePostLike) {
  const alert = post.lostFoundAlert;
  const location = alert?.lastSeenLocation?.trim() || "위치 미확인";
  const lines = [
    buildLostFoundShareTitle(post),
    "",
    `게시글: ${post.title}`,
    `동물: ${alert?.petType?.trim() || "미확인"}`,
    alert?.breed?.trim() ? `특징: ${alert.breed.trim()}` : null,
    `마지막 확인: ${formatLostFoundShareDate(alert?.lastSeenAt)}`,
    `위치: ${location}`,
    "",
    "제보할 때는 위치와 시간을 함께 남겨 주세요.",
    "집 주소 전체, 전화번호, 오픈채팅 링크는 공개 댓글에 남기지 마세요.",
    toAbsoluteUrl(`/posts/${post.id}/guest`),
  ];

  return lines.filter((line): line is string => Boolean(line)).join("\n");
}

export function buildLostFoundShareChecklist(post: LostFoundSharePostLike) {
  const alert = post.lostFoundAlert;
  const alertLabel = getLostFoundAlertTypeLabel(alert?.alertType);
  const petType = alert?.petType?.trim() || "반려동물";
  return [
    `${alertLabel} ${petType} 사진과 특징 확인`,
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
