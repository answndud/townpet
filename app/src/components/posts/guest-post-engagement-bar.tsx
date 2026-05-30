"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type GuestPostEngagementBarProps = {
  likeCount: number;
  dislikeCount: number;
  loginHref: string;
  postUrl: string;
};

type LoginPrompt = "LIKE" | "DISLIKE" | "BOOKMARK" | null;

const promptCopy: Record<Exclude<LoginPrompt, null>, string> = {
  LIKE: "좋아요는 로그인 후 사용할 수 있습니다.",
  DISLIKE: "싫어요는 로그인 후 사용할 수 있습니다.",
  BOOKMARK: "북마크는 로그인 후 저장할 수 있습니다.",
};

export function GuestPostEngagementBar({
  likeCount,
  dislikeCount,
  loginHref,
  postUrl,
}: GuestPostEngagementBarProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [loginPrompt, setLoginPrompt] = useState<LoginPrompt>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const closePrompt = useCallback(() => {
    setLoginPrompt(null);
  }, []);

  useEffect(() => {
    if (!loginPrompt) {
      return;
    }

    const timer = globalThis.setTimeout(closePrompt, 3200);
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target)) {
        return;
      }
      closePrompt();
    };
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target)) {
        return;
      }
      closePrompt();
    };
    const handleTouchStart = (event: TouchEvent) => {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target)) {
        return;
      }
      closePrompt();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePrompt();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      globalThis.clearTimeout(timer);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePrompt, loginPrompt]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setShareMessage("링크를 복사했습니다.");
    } catch {
      setShareMessage("주소창의 링크를 복사해 주세요.");
    }
  };

  const actionClassName =
    "inline-flex min-h-10 items-center gap-1.5 px-2 text-[12px] font-semibold text-[#54739e] transition hover:text-[#1f4f8f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-2";

  return (
    <div ref={rootRef} className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
      <div className="hidden sm:block" aria-hidden="true" />
      <div className="relative flex justify-center">
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            className={actionClassName}
            onClick={() => setLoginPrompt("LIKE")}
            aria-label={`좋아요 ${likeCount.toLocaleString()}개. 로그인 후 사용할 수 있습니다.`}
          >
            <span aria-hidden="true">좋아요</span>
            <span>{likeCount.toLocaleString()}</span>
          </button>
          <button
            type="button"
            className={actionClassName}
            onClick={() => setLoginPrompt("DISLIKE")}
            aria-label={`싫어요 ${dislikeCount.toLocaleString()}개. 로그인 후 사용할 수 있습니다.`}
          >
            <span aria-hidden="true">싫어요</span>
            <span>{dislikeCount.toLocaleString()}</span>
          </button>
        </div>
        {loginPrompt ? (
          <div className="absolute left-1/2 top-[calc(100%+8px)] z-10 w-[min(86vw,300px)] -translate-x-1/2 rounded-md border border-[#dbe6f6] bg-white px-3 py-2 text-[12px] leading-5 text-[#355988] shadow-[0_8px_18px_rgba(16,40,74,0.12)]">
            <p>{promptCopy[loginPrompt]}</p>
            <div className="mt-1.5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closePrompt}
                className="inline-flex min-h-8 items-center px-1 text-xs font-semibold text-[#54739e] hover:underline hover:underline-offset-4"
              >
                닫기
              </button>
              <Link
                href={loginHref}
                className="inline-flex min-h-8 items-center rounded-md bg-[#3567b5] px-2.5 text-xs font-semibold text-white"
              >
                로그인하기
              </Link>
            </div>
          </div>
        ) : null}
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setLoginPrompt("BOOKMARK")}
          aria-label="북마크. 로그인 후 저장할 수 있습니다."
          title="북마크"
          className="inline-flex min-h-8 min-w-8 items-center justify-center px-1 text-xs font-semibold leading-none text-[#54739e] transition hover:text-[#1f4f8f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-2"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M5.5 3.5h9v13L10 13.8l-4.5 2.7z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => void handleShare()}
          aria-label="게시글 공유 링크 복사"
          className="inline-flex min-h-8 items-center justify-center px-1.5 text-xs font-semibold text-[#54739e] transition hover:text-[#1f4f8f] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-2"
        >
          공유
        </button>
        {shareMessage ? (
          <span role="status" aria-live="polite" className="text-[11px] font-medium text-[#5a7398]">
            {shareMessage}
          </span>
        ) : null}
      </div>
    </div>
  );
}
