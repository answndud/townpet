"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

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
    ? "inline-flex h-7 min-w-[58px] items-center justify-center rounded-md border px-2 text-[10px] font-semibold leading-none transition disabled:cursor-not-allowed disabled:opacity-60"
    : "inline-flex h-9 min-w-[80px] items-center justify-center rounded-lg border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

  const handleToggle = () => {
    if (!canBookmark) {
      setLoginIntent(true);
      return;
    }

    const previous = bookmarked;
    setError(null);
    setLoginIntent(false);
    setBookmarked(!previous);

    startTransition(async () => {
      const result = await togglePostBookmarkAction(postId);
      if (!result.ok) {
        setBookmarked(previous);
        setError(result.message);
        return;
      }

      setBookmarked(result.bookmarked);
    });
  };

  return (
    <div className={`relative ${compact ? "inline-flex" : "flex flex-col items-start gap-1"}`}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={`${buttonClass} ${
          bookmarked
            ? "border-[#3567b5] bg-[#3567b5] text-white"
            : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
        }`}
      >
        {bookmarked ? "북마크됨" : "북마크"}
      </button>
      {!canBookmark && showLoginHint && loginIntent ? (
        <div
          className={`absolute left-0 top-[calc(100%+8px)] z-10 max-w-[min(86vw,260px)] rounded-lg border border-[#dbe6f6] bg-white px-2.5 py-1.5 text-[#355988] shadow-[0_8px_18px_rgba(16,40,74,0.12)] ${
            compact ? "text-[11px]" : "text-xs"
          }`}
        >
          로그인 후 북마크 가능.{" "}
          <Link href={loginHref} className="font-semibold text-[#2f5da4] underline underline-offset-2">
            로그인하기
          </Link>
        </div>
      ) : null}
      {error ? (
        <span className={compact ? "mt-1 block text-[11px] text-rose-600" : "text-xs text-rose-600"}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
