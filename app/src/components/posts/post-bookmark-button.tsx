"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { togglePostBookmarkAction } from "@/server/actions/post";

type PostBookmarkButtonProps = {
  postId: string;
  currentBookmarked?: boolean | null;
  compact?: boolean;
  canBookmark?: boolean;
  loginHref?: string;
  showLoginHint?: boolean;
};

export function PostBookmarkButton({
  postId,
  currentBookmarked,
  compact = false,
  canBookmark = true,
  loginHref = "/login",
  showLoginHint = true,
}: PostBookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(Boolean(currentBookmarked));
  const [loginIntent, setLoginIntent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const actionLockRef = useRef(false);

  useEffect(() => {
    setBookmarked(Boolean(currentBookmarked));
    setError(null);
    setLoginIntent(false);
  }, [currentBookmarked, postId]);

  useEffect(() => {
    if (!loginIntent) {
      return;
    }

    const timer = window.setTimeout(() => {
      setLoginIntent(false);
    }, 2600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loginIntent]);

  const buttonClass = compact
    ? "inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border px-2 text-xs font-semibold leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    : "inline-flex min-h-10 min-w-[72px] items-center justify-center rounded-lg border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
  const buttonLabel = bookmarked ? "북마크 해제" : "북마크";

  const handleToggle = () => {
    if (actionLockRef.current) {
      return;
    }

    if (!canBookmark) {
      setLoginIntent(true);
      return;
    }

    const previous = bookmarked;
    actionLockRef.current = true;
    setError(null);
    setLoginIntent(false);
    setBookmarked(!previous);

    startTransition(async () => {
      try {
        const result = await togglePostBookmarkAction(postId, !previous);
        if (!result.ok) {
          setBookmarked(previous);
          setError(result.message);
          return;
        }

        setBookmarked(result.bookmarked);
      } finally {
        actionLockRef.current = false;
      }
    });
  };

  return (
    <div className={`relative ${compact ? "inline-flex" : "flex flex-col items-start gap-1"}`}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        aria-label={buttonLabel}
        title={buttonLabel}
        className={`${buttonClass} ${
          bookmarked
            ? "border-[#3567b5] bg-[#f5f9ff] text-[#2d5fab]"
            : "border-[#dbe6f5] bg-white text-[#54739e] hover:bg-[#f5f9ff] hover:text-[#315b9a]"
        }`}
      >
        {compact ? (
          <>
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="h-4 w-4"
              fill={bookmarked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M5.5 3.5h9v13L10 13.8l-4.5 2.7z" />
            </svg>
            <span className="sr-only">{buttonLabel}</span>
          </>
        ) : bookmarked ? "북마크됨" : "북마크"}
      </button>
      {!canBookmark && showLoginHint && loginIntent ? (
        <div
          className={`absolute left-0 top-[calc(100%+8px)] z-10 max-w-[min(86vw,260px)] rounded-lg border border-[#dbe6f6] bg-white px-2.5 py-1.5 text-[#355988] shadow-[0_8px_18px_rgba(16,40,74,0.12)] ${
            compact ? "text-[11px]" : "text-xs"
          }`}
        >
          로그인 후 북마크 가능.{" "}
          <Link href={loginHref} className="inline-flex min-h-10 items-center font-semibold text-[#2f5da4] underline underline-offset-2">
            로그인하기
          </Link>
        </div>
      ) : null}
      {error ? (
        <span
          className={compact ? "mt-1 block text-[11px] font-medium text-rose-700" : "text-xs font-medium text-rose-700"}
          role="alert"
          aria-live="polite"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
