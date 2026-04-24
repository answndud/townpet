"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { ReactionLoginPrompt } from "@/components/posts/reaction-login-prompt";
import { subscribeViewerShellSync } from "@/lib/viewer-shell-sync";
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
  align?: "start" | "center" | "end";
  onStateChange?: (nextState: {
    reaction: ReactionType | null;
    likeCount: number;
    dislikeCount: number;
  }) => void;
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
  align = "center",
  onStateChange,
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
  const [authBlocked, setAuthBlocked] = useState(false);
  const [isPending, startTransition] = useTransition();
  const actionLockRef = useRef(false);

  useEffect(() => {
    setLikes(initialLikeCount);
    setDislikes(initialDislikeCount);
  }, [initialDislikeCount, initialLikeCount]);

  useEffect(() => {
    if (currentReaction === undefined) {
      return;
    }

    setReaction(currentReaction);
    setReactionLoaded(true);
    setHasInteracted(false);
  }, [currentReaction]);

  useEffect(() => {
    setHasInteracted(false);
    setError(null);
    setLoginIntent(null);
    if (currentReaction !== undefined) {
      setReaction(currentReaction);
      setReactionLoaded(true);
      return;
    }

    setReaction(null);
    setReactionLoaded(false);
  }, [currentReaction, postId]);

  useEffect(() => {
    if (!loginIntent) {
      return;
    }

    const timer = window.setTimeout(() => {
      setLoginIntent(null);
    }, 3200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loginIntent]);

  useEffect(
    () =>
      subscribeViewerShellSync((payload) => {
        if (payload.reason === "auth-logout") {
          setAuthBlocked(true);
          return;
        }

        if (payload.reason === "auth-login") {
          setAuthBlocked(false);
        }
      }),
    [],
  );

  const effectiveReaction = hasInteracted ? reaction : (currentReaction ?? reaction);
  const effectiveCanReact = canReact && !authBlocked;
  const loginPromptMessage = "좋아요/싫어요는 로그인 후 이용할 수 있어요.";

  useEffect(() => {
    if (!effectiveCanReact || reactionLoaded) {
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        const response = await fetch(`/api/posts/${postId}/reaction`, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
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
  }, [effectiveCanReact, hasInteracted, postId, reactionLoaded]);

  const buttonClass = compact
    ? "inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-semibold transition sm:min-h-[32px] sm:px-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    : "inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold transition sm:min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";
  const rootAlignmentClass =
    align === "start" ? "justify-start" : align === "end" ? "justify-end" : "justify-center";

  const handleToggle = (target: ReactionType) => {
    if (actionLockRef.current) {
      return;
    }

    if (!effectiveCanReact) {
      setLoginIntent(target);
      return;
    }

    setHasInteracted(true);

    const previous = {
      reaction: effectiveReaction,
      likeCount: likes,
      dislikeCount: dislikes,
    };
    const optimistic = getNextState(effectiveReaction, target, likes, dislikes);
    actionLockRef.current = true;

    setError(null);
    setLoginIntent(null);
    setReaction(optimistic.reaction);
    setLikes(optimistic.likeCount);
    setDislikes(optimistic.dislikeCount);
    onStateChange?.(optimistic);

    startTransition(async () => {
      try {
        const result = await togglePostReactionAction(postId, optimistic.reaction);
        if (!result.ok) {
          setReaction(previous.reaction);
          setLikes(previous.likeCount);
          setDislikes(previous.dislikeCount);
          if (result.code === "AUTH_REQUIRED") {
            setAuthBlocked(true);
            setLoginIntent(target);
          }
          setError(result.message);
          onStateChange?.(previous);
          return;
        }

        setReaction(result.reaction);
        setLikes(result.likeCount);
        setDislikes(result.dislikeCount);
        onStateChange?.({
          reaction: result.reaction,
          likeCount: result.likeCount,
          dislikeCount: result.dislikeCount,
        });
      } finally {
        actionLockRef.current = false;
      }
    });
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${rootAlignmentClass}`}>
      <div className="relative">
        <button
          type="button"
          onClick={() => handleToggle(REACTION_TYPE.LIKE)}
          disabled={isPending}
          aria-disabled={!effectiveCanReact || isPending}
          aria-label={`좋아요 ${likes.toLocaleString()}개`}
          title={`좋아요 ${likes.toLocaleString()}개`}
          className={`${buttonClass} ${
            effectiveReaction === REACTION_TYPE.LIKE
              ? "border-[#3567b5] bg-[#f5f9ff] text-[#2d5fab]"
              : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
          }`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="h-3.5 w-3.5 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M8 8V4.8A2.8 2.8 0 0 1 10.8 2l.5 3.1c.2 1-.1 2-.7 2.8L10 8.6h4.4A2.6 2.6 0 0 1 17 11.2l-.8 4.6a2.6 2.6 0 0 1-2.6 2.2H8z" />
            <path d="M3 8h3v10H3z" />
          </svg>
          <span className="hidden sm:inline">좋아요</span>
          <span className="tabular-nums">{likes.toLocaleString()}</span>
        </button>
        {!effectiveCanReact && showLoginHint && loginIntent === REACTION_TYPE.LIKE ? (
          <ReactionLoginPrompt
            isOpen
            message={loginPromptMessage}
            loginHref={loginHref}
            align={align}
            onClose={() => setLoginIntent(null)}
          />
        ) : null}
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => handleToggle(REACTION_TYPE.DISLIKE)}
          disabled={isPending}
          aria-disabled={!effectiveCanReact || isPending}
          aria-label={`싫어요 ${dislikes.toLocaleString()}개`}
          title={`싫어요 ${dislikes.toLocaleString()}개`}
          className={`${buttonClass} ${
            effectiveReaction === REACTION_TYPE.DISLIKE
              ? "border-[#d94b60] bg-[#fff7f8] text-[#d83b52]"
              : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
          }`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="h-3.5 w-3.5 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M12 12v3.2A2.8 2.8 0 0 1 9.2 18l-.5-3.1c-.2-1 .1-2 .7-2.8l.6-.7H5.6A2.6 2.6 0 0 1 3 8.8l.8-4.6A2.6 2.6 0 0 1 6.4 2H12z" />
            <path d="M17 12h-3V2h3z" />
          </svg>
          <span className="hidden sm:inline">싫어요</span>
          <span className="tabular-nums">{dislikes.toLocaleString()}</span>
        </button>
        {!effectiveCanReact && showLoginHint && loginIntent === REACTION_TYPE.DISLIKE ? (
          <ReactionLoginPrompt
            isOpen
            message={loginPromptMessage}
            loginHref={loginHref}
            align={align}
            onClose={() => setLoginIntent(null)}
          />
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
