import { NextRequest } from "next/server";
import { PostStatus, PostType } from "@prisma/client";

import {
  buildLostFoundGuestPostUrl,
  buildLostFoundPosterFileName,
  buildLostFoundShareTitle,
  formatLostFoundShareDate,
  getLostFoundAlertTypeLabel,
  getLostFoundStatusLabel,
} from "@/lib/lost-found-share";
import { monitorUnhandledError } from "@/server/error-monitor";
import { getPostById } from "@/server/queries/post.queries";
import { assertPostReadable } from "@/server/services/post-read-access.service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clipText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function renderLine(text: string, x: number, y: number, size = 42, weight = 600) {
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="#10284a">${escapeXml(text)}</text>`;
}

function buildContentDisposition(filename: string) {
  return `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const post = await getPostById(id);
    if (!post || post.type !== PostType.LOST_FOUND || !post.lostFoundAlert) {
      return new Response("Not found", { status: 404 });
    }

    try {
      await assertPostReadable(post);
    } catch {
      return new Response("Not found", { status: 404 });
    }

    if (post.status !== PostStatus.ACTIVE) {
      return new Response("Not found", { status: 404 });
    }

    const alert = post.lostFoundAlert;
    const alertLabel = getLostFoundAlertTypeLabel(alert.alertType);
    const title = buildLostFoundShareTitle(post);
    const statusLabel = getLostFoundStatusLabel(alert.status);
    const location = clipText(alert.lastSeenLocation || "위치 미확인", 30);
    const breed = clipText(alert.breed || "특징 미입력", 30);
    const petType = clipText(alert.petType || "반려동물", 18);
    const seenAt = formatLostFoundShareDate(alert.lastSeenAt);
    const postTitle = clipText(post.title, 36);
    const guestPostUrl = buildLostFoundGuestPostUrl(post.id);
    const shouldDownload = new URL(request.url).searchParams.get("download") === "1";

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920" role="img" aria-label="${escapeXml(title)}">
  <rect width="1080" height="1920" fill="#f8fafd"/>
  <rect x="72" y="84" width="936" height="1752" rx="32" fill="#ffffff" stroke="#dbe6f5" stroke-width="3"/>
  <text x="112" y="168" font-size="30" font-weight="700" fill="#3567b5" letter-spacing="4">TownPet</text>
  <rect x="112" y="218" width="220" height="64" rx="32" fill="#fff4f3" stroke="#f0c7c3" stroke-width="2"/>
  <text x="142" y="260" font-size="32" font-weight="800" fill="#9d3f45">${escapeXml(alertLabel)}</text>
  <rect x="350" y="218" width="210" height="64" rx="32" fill="#f8fbff" stroke="#dbe6f5" stroke-width="2"/>
  <text x="382" y="260" font-size="30" font-weight="700" fill="#315b9a">${escapeXml(statusLabel)}</text>
  <text x="112" y="372" font-size="68" font-weight="850" fill="#10284a">${escapeXml(petType)} 제보 요청</text>
  <text x="112" y="450" font-size="34" font-weight="600" fill="#4f678d">${escapeXml(postTitle)}</text>
  <rect x="112" y="540" width="856" height="438" rx="24" fill="#f8fbff" stroke="#dbe6f5" stroke-width="2"/>
  ${renderLine("마지막 확인", 158, 626, 30, 700)}
  ${renderLine(seenAt, 158, 690, 48, 800)}
  ${renderLine("위치", 158, 790, 30, 700)}
  ${renderLine(location, 158, 854, 46, 800)}
  ${renderLine("품종/특징", 158, 954, 30, 700)}
  ${renderLine(breed, 158, 1018, 42, 750)}
  <rect x="112" y="1060" width="856" height="374" rx="24" fill="#ffffff" stroke="#dbe6f5" stroke-width="2"/>
  <text x="158" y="1144" font-size="34" font-weight="800" fill="#10284a">제보할 때 함께 남겨주세요</text>
  <text x="158" y="1220" font-size="32" font-weight="600" fill="#4f678d">1. 발견 위치와 시간</text>
  <text x="158" y="1282" font-size="32" font-weight="600" fill="#4f678d">2. 사진 또는 이동 방향</text>
  <text x="158" y="1344" font-size="32" font-weight="600" fill="#4f678d">3. 동물 상태와 안전 여부</text>
  <text x="158" y="1406" font-size="28" font-weight="650" fill="#8a5a65">연락처, 오픈채팅, 집 주소 전체는 공개하지 마세요.</text>
  <text x="112" y="1530" font-size="28" font-weight="700" fill="#3567b5">제보 링크</text>
  <text x="112" y="1588" font-size="22" font-weight="700" fill="#244a7f">${escapeXml(guestPostUrl)}</text>
  <text x="112" y="1748" font-size="26" font-weight="600" fill="#7b8fac">지역 반려생활 정보, TownPet</text>
</svg>`;

    const headers = new Headers({
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=60, stale-while-revalidate=300",
    });

    if (shouldDownload) {
      headers.set("content-disposition", buildContentDisposition(buildLostFoundPosterFileName(post)));
    }

    return new Response(svg, { headers });
  } catch (error) {
    await monitorUnhandledError(error, { route: "GET /api/posts/[id]/lost-found-share.svg", request });
    return new Response("Internal server error", { status: 500 });
  }
}
