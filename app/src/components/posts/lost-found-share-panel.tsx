"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import type { PostDetailItem } from "@/components/posts/post-detail-types";
import {
  buildLostFoundPosterAlt,
  buildLostFoundPosterUrl,
  buildLostFoundShareChecklist,
  buildLostFoundShareSummary,
  buildLostFoundShareText,
} from "@/lib/lost-found-share";
import { buildLostFoundShareActionEvent } from "@/lib/lost-found-acquisition-events";
import { copyTextToClipboard } from "@/lib/post-share";
import { sendAcquisitionEvent } from "@/lib/acquisition-tracking";

type LostFoundSharePanelProps = {
  post: PostDetailItem;
  postUrl: string;
};

type ShareAction = "LINK_COPY" | "KAKAO_TEXT_COPY" | "POSTER_OPEN";

const lostFoundShareTextActionClassName =
  "tp-text-muted inline-flex min-h-9 items-center justify-center px-1.5 text-xs font-semibold transition hover:text-[#2f5da4] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1";
const lostFoundSharePrimaryActionClassName =
  "inline-flex min-h-9 items-center justify-center rounded-md bg-[#3567b5] px-3 text-xs font-semibold text-[#fbfdff] transition hover:bg-[#2f5da4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1";

async function recordLostFoundShareAction(postId: string, action: ShareAction) {
  void sendAcquisitionEvent(buildLostFoundShareActionEvent(postId, action));

  await fetch(`/api/posts/${postId}/share`, {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ action }),
  }).catch(() => undefined);
}

export function LostFoundSharePanel({ post, postUrl }: LostFoundSharePanelProps) {
  const [message, setMessage] = useState<string | null>(null);
  const shareText = useMemo(() => buildLostFoundShareText(post), [post]);
  const checklist = useMemo(() => buildLostFoundShareChecklist(post), [post]);
  const shareSummary = useMemo(() => buildLostFoundShareSummary(post), [post]);
  const posterUrl = buildLostFoundPosterUrl(post.id);
  const posterPath = `/api/posts/${post.id}/lost-found-share.svg`;
  const posterAlt = buildLostFoundPosterAlt(post);

  const handleCopyLink = async () => {
    const result = await copyTextToClipboard(
      typeof navigator === "undefined" ? undefined : navigator.clipboard,
      postUrl,
    );
    setMessage(result.message);
    void recordLostFoundShareAction(post.id, "LINK_COPY");
  };

  const handleCopyKakaoText = async () => {
    const result = await copyTextToClipboard(
      typeof navigator === "undefined" ? undefined : navigator.clipboard,
      shareText,
    );
    setMessage(result.ok ? "카카오톡에 붙여넣을 문구를 복사했습니다." : result.message);
    void recordLostFoundShareAction(post.id, "KAKAO_TEXT_COPY");
  };

  const handlePosterOpen = () => {
    void recordLostFoundShareAction(post.id, "POSTER_OPEN");
  };

  return (
    <section
      id="lost-found-share-tools"
      className="tp-card scroll-mt-20 border-[#d8e4f6] p-4 sm:p-5"
      aria-labelledby="lost-found-share-title"
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4e6f9f]">
            공유 준비
          </p>
          <h2 id="lost-found-share-title" className="mt-1 text-base font-semibold text-[#10284a]">
            주변 공유 도구
          </h2>
          <p className="mt-1 max-w-[68ch] text-xs leading-5 text-[#526d95]">
            복사 문구와 전단 이미지에 같은 핵심 정보를 넣습니다. 위치, 시간, 특징만 남기고 개인 연락처와 상세 주소는 제외합니다.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5" aria-label="공유 문구에 포함되는 정보">
            {shareSummary.map((item) => (
              <span
                key={item}
                className="inline-flex min-h-6 items-center rounded-md border border-[#dbe6f5] bg-[#f8fbff] px-2 text-[11px] font-medium text-[#526d95]"
              >
                {item}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] font-medium text-[#6a83a9]">
            공개 연락처, 오픈채팅, 집 주소 전체 제외
          </p>
        </div>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            className={`${lostFoundSharePrimaryActionClassName} w-full sm:w-auto`}
            aria-label="분실/목격 카카오톡 공유 문구 복사"
            onClick={handleCopyKakaoText}
          >
            카카오톡 문구 복사
          </button>
          <button
            type="button"
            className={`${lostFoundShareTextActionClassName} w-full sm:w-auto`}
            aria-label="분실/목격 게시글 링크 복사"
            onClick={handleCopyLink}
          >
            링크 복사
          </button>
          <a
            href={posterUrl}
            target="_blank"
            rel="noreferrer"
            className={`${lostFoundShareTextActionClassName} w-full sm:w-auto`}
            aria-label="분실/목격 인스타 또는 전단 이미지 새 창에서 열기"
            onClick={handlePosterOpen}
          >
            인스타/전단 이미지
          </a>
        </div>
      </div>

      <ol className="mt-3 grid gap-1.5 border-t border-[#dbe6f5] pt-2 text-xs leading-5 text-[#526d95] sm:grid-cols-2">
        {checklist.map((item, index) => (
          <li key={item} className="flex gap-2">
            <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-[#eef4fd] text-[11px] font-semibold text-[#315b9a]">
              {index + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>

      <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6c84ab]">
            공유 문구
          </p>
          <pre className="mt-2 min-h-28 max-w-full overflow-auto whitespace-pre-wrap break-words border-t border-[#dbe6f5] pt-2 text-xs leading-5 text-[#244a7f]">
            {shareText}
          </pre>
        </div>
        <a
          href={posterUrl}
          target="_blank"
          rel="noreferrer"
          className="block w-full max-w-full overflow-hidden rounded-md border border-[#dbe6f5] bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e89d8]/35"
          onClick={handlePosterOpen}
        >
          <Image
            src={posterPath}
            alt={posterAlt}
            width={360}
            height={640}
            className="aspect-[9/16] h-full w-full object-cover"
            loading="lazy"
          />
        </a>
      </div>

      <p
        className={message ? "mt-3 text-xs font-medium text-[#4f678d]" : "sr-only"}
        role="status"
        aria-live="polite"
      >
        {message ?? ""}
      </p>
    </section>
  );
}
