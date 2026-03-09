"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import {
  calculatePostReactionScore,
  getPostReactionScoreMagnitude,
  getPostReactionScoreTone,
} from "@/lib/post-reaction-score";
import { togglePostReactionAction } from "@/server/actions/post";

const REACTION_TYPE = {
  LIKE: "LIKE",
  DISLIKE: "DISLIKE",
} as const;

type ReactionType = (typeof REACTION_TYPE)[keyof typeof REACTION_TYPE];

type PostReactionControlsProps = {
  postId: string;
  likeCount?: number | null;
  dislikeCount?: number | null;
  currentReaction?: ReactionType | null;
  compact?: boolean;
  canReact?: boolean;
  loginHref?: string;
  showLoginHint?: boolean;
};

function getNextState(
  current: ReactionType | null,
  target: ReactionType,
  likeCount: number,
  dislikeCount: number,
) {
  if (current === target) {
    if (target === REACTION_TYPE.LIKE) {
      return {
        reaction: null,
        likeCount: Math.max(0, likeCount - 1),
        dislikeCount,
      };
    }

    return {
      reaction: null,
      likeCount,
      dislikeCount: Math.max(0, dislikeCount - 1),
    };
  }

  if (target === REACTION_TYPE.LIKE) {
    return {
      reaction: REACTION_TYPE.LIKE,
      likeCount: likeCount + 1,
      dislikeCount:
        current === REACTION_TYPE.DISLIKE
          ? Math.max(0, dislikeCount - 1)
          : dislikeCount,
    };
  }

  return {
    reaction: REACTION_TYPE.DISLIKE,
    likeCount:
      current === REACTION_TYPE.LIKE ? Math.max(0, likeCount - 1) : likeCount,
    dislikeCount: dislikeCount + 1,
  };
}

export function PostReactionControls({
  postId,
  likeCount,
  dislikeCount,
  currentReaction,
  compact = false,
  canReact = true,
  loginHref = "/login",
  showLoginHint = true,
}: PostReactionControlsProps) {
  const initialLikeCount =
    Number.isFinite(likeCount) && Number(likeCount) > 0 ? Math.trunc(Number(likeCount)) : 0;
  const initialDislikeCount =
    Number.isFinite(dislikeCount) && Number(dislikeCount) > 0
      ? Math.trunc(Number(dislikeCount))
      : 0;

  const [reaction, setReaction] = useState<ReactionType | null>(currentReaction ?? null);
  const [reactionLoaded, setReactionLoaded] = useState(currentReaction !== undefined);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [likes, setLikes] = useState(initialLikeCount);
  const [dislikes, setDislikes] = useState(initialDislikeCount);
  const [loginIntent, setLoginIntent] = useState<ReactionType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!loginIntent) {
      return;
    }

    const timer = window.setTimeout(() => {
      setLoginIntent(null);
    }, 2600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loginIntent]);

  const effectiveReaction = hasInteracted ? reaction : (currentReaction ?? reaction);

  useEffect(() => {
    if (!canReact || reactionLoaded) {
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        const response = await fetch(`/api/posts/${postId}/reaction`, {
          method: "GET",
          credentials: "same-origin",
        });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as {
          ok: boolean;
          data?: { reaction: ReactionType | null };
        };
        if (!payload.ok || cancelled || hasInteracted) {
          return;
        }
        setReaction(payload.data?.reaction ?? null);
        setReactionLoaded(true);
      } catch {
        if (!cancelled) {
          setReactionLoaded(true);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [canReact, hasInteracted, postId, reactionLoaded]);

  const buttonClass = compact
    ? "inline-flex tp-btn-xs min-w-[60px] items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-60"
    : "inline-flex tp-btn-sm min-w-[76px] items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-60";
  const reactionScore = calculatePostReactionScore(likes, dislikes);
  const reactionScoreMagnitude = getPostReactionScoreMagnitude(reactionScore);
  const reactionScoreTone = getPostReactionScoreTone(reactionScore);
  const reactionScoreDirectionLabel =
    reactionScore > 0 ? "좋아요 우세" : reactionScore < 0 ? "싫어요 우세" : "반응 균형";
  const reactionScoreClass =
    reactionScoreTone === "positiveStrong"
      ? "border-[#739de7] bg-[#e1edff] text-[#184f9c]"
      : reactionScoreTone === "positive"
        ? "border-[#a5c1ee] bg-[#eef5ff] text-[#275ea8]"
        : reactionScoreTone === "positiveSoft"
          ? "border-[#cbdcf7] bg-[#f5f9ff] text-[#3567b5]"
          : reactionScoreTone === "negativeStrong"
            ? "border-[#e47e93] bg-[#ffe7eb] text-[#b52639]"
            : reactionScoreTone === "negative"
              ? "border-[#ec9dad] bg-[#fff0f2] text-[#c73b4d]"
              : reactionScoreTone === "negativeSoft"
                ? "border-[#f3cbd2] bg-[#fff6f7] text-[#d14a5b]"
                : "border-[#d8e4f6] bg-white text-[#5d7499]";

  const handleToggle = (target: ReactionType) => {
    if (!canReact) {
      setLoginIntent(target);
      return;
    }

    setHasInteracted(true);

    const previous = { reaction: effectiveReaction, likes, dislikes };
    const optimistic = getNextState(effectiveReaction, target, likes, dislikes);

    setError(null);
    setLoginIntent(null);
    setReaction(optimistic.reaction);
    setLikes(optimistic.likeCount);
    setDislikes(optimistic.dislikeCount);

    startTransition(async () => {
      const result = await togglePostReactionAction(postId, target);
      if (!result.ok) {
        setReaction(previous.reaction);
        setLikes(previous.likes);
        setDislikes(previous.dislikes);
        setError(result.message);
        return;
      }

      setReaction(result.reaction);
      setLikes(result.likeCount);
      setDislikes(result.dislikeCount);
    });
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "justify-end" : "justify-center"}`}>
      <div className="relative">
        <button
          type="button"
          onClick={() => handleToggle(REACTION_TYPE.LIKE)}
          disabled={isPending}
          aria-label={`좋아요 ${likes.toLocaleString()}개`}
          title={`좋아요 ${likes.toLocaleString()}개`}
          className={`${buttonClass} ${
            effectiveReaction === REACTION_TYPE.LIKE
              ? "border-[#3567b5] bg-[#f5f9ff] text-[#2d5fab]"
              : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
          }`}
        >
          좋아요
        </button>
        {!canReact && showLoginHint && loginIntent === REACTION_TYPE.LIKE ? (
          <div
            className={`absolute left-0 top-[calc(100%+8px)] z-10 max-w-[min(86vw,260px)] rounded-lg border border-[#dbe6f6] bg-white px-2.5 py-1.5 text-[#355988] shadow-[0_8px_18px_rgba(16,40,74,0.12)] sm:left-1/2 sm:-translate-x-1/2 ${
              compact ? "text-[11px]" : "text-xs"
            }`}
          >
            로그인 후 좋아요 누르기 가능.{" "}
            <Link href={loginHref} className="font-semibold text-[#2f5da4] underline underline-offset-2">
              로그인하기
            </Link>
          </div>
        ) : null}
      </div>
      <div
        aria-label={`${reactionScoreDirectionLabel} ${reactionScoreMagnitude.toLocaleString()}`}
        title={`좋아요 ${likes.toLocaleString()}개, 싫어요 ${dislikes.toLocaleString()}개`}
        className={`inline-flex min-w-[64px] items-center justify-center rounded-lg border px-2.5 py-1 text-[15px] font-semibold leading-none tabular-nums ${reactionScoreClass} ${
          compact ? "min-h-[1.875rem] text-xs" : "min-h-[2rem]"
        }`}
      >
        {reactionScoreMagnitude.toLocaleString()}
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => handleToggle(REACTION_TYPE.DISLIKE)}
          disabled={isPending}
          aria-label={`싫어요 ${dislikes.toLocaleString()}개`}
          title={`싫어요 ${dislikes.toLocaleString()}개`}
          className={`${buttonClass} ${
            effectiveReaction === REACTION_TYPE.DISLIKE
              ? "border-[#d94b60] bg-[#fff7f8] text-[#d83b52]"
              : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
          }`}
        >
          싫어요
        </button>
        {!canReact && showLoginHint && loginIntent === REACTION_TYPE.DISLIKE ? (
          <div
            className={`absolute right-0 top-[calc(100%+8px)] z-10 max-w-[min(86vw,260px)] rounded-lg border border-[#dbe6f6] bg-white px-2.5 py-1.5 text-[#355988] shadow-[0_8px_18px_rgba(16,40,74,0.12)] sm:left-1/2 sm:right-auto sm:-translate-x-1/2 ${
              compact ? "text-[11px]" : "text-xs"
            }`}
          >
            로그인 후 싫어요 누르기 가능.{" "}
            <Link href={loginHref} className="font-semibold text-[#2f5da4] underline underline-offset-2">
              로그인하기
            </Link>
          </div>
        ) : null}
      </div>
      {!compact && error ? (
        <span className="text-xs text-rose-600">{error}</span>
      ) : null}
      {compact && error ? (
        <span className="w-full text-[11px] text-rose-600">{error}</span>
      ) : null}
    </div>
  );
}
