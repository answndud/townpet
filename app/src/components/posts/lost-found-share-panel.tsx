"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import type { PostDetailItem } from "@/components/posts/post-detail-types";
import {
  buildLostFoundPosterAlt,
  buildLostFoundPosterUrl,
  buildLostFoundShareText,
} from "@/lib/lost-found-share";
import { copyTextToClipboard } from "@/lib/post-share";

type LostFoundSharePanelProps = {
  post: PostDetailItem;
  postUrl: string;
};

type ShareAction = "LINK_COPY" | "KAKAO_TEXT_COPY" | "POSTER_OPEN";

async function recordLostFoundShareAction(postId: string, action: ShareAction) {
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
    <section className="tp-card border-[#d8e4f6] p-4 sm:p-5" aria-labelledby="lost-found-share-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4e6f9f]">
            공유 도구
          </p>
          <h2 id="lost-found-share-title" className="mt-1 text-base font-bold text-[#10284a]">
            분실/목격 제보를 빠르게 공유하기
          </h2>
          <p className="mt-1 max-w-[68ch] text-xs leading-5 text-[#526d95]">
            위치, 시간, 특징 중심으로 공유합니다. 개인 연락처나 집 주소 전체는 공개 문구에 넣지 않습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="tp-btn-soft inline-flex min-h-10 items-center px-3 text-xs font-semibold"
            onClick={handleCopyLink}
          >
            링크 복사
          </button>
          <button
            type="button"
            className="tp-btn-primary inline-flex min-h-10 items-center px-3 text-xs font-semibold"
            onClick={handleCopyKakaoText}
          >
            카카오톡 문구 복사
          </button>
          <a
            href={posterUrl}
            target="_blank"
            rel="noreferrer"
            className="tp-btn-soft inline-flex min-h-10 items-center px-3 text-xs font-semibold"
            onClick={handlePosterOpen}
          >
            공유 이미지 열기
          </a>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
        <pre className="min-h-32 overflow-auto whitespace-pre-wrap rounded-lg border border-[#dbe6f5] bg-[#f8fbff] p-3 text-xs leading-5 text-[#244a7f]">
          {shareText}
        </pre>
        <a
          href={posterUrl}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-lg border border-[#dbe6f5] bg-[#f8fbff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e89d8]/35"
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
