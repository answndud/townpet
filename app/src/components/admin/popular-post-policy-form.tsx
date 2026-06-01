"use client";

import { useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";

import {
  POPULAR_POST_MIN_LIKES_MAX,
  POPULAR_POST_MIN_LIKES_MIN,
} from "@/lib/popular-post-policy";
import { updatePopularPostPolicyAction } from "@/server/actions/policy";

type PopularPostPolicyFormProps = {
  initialPolicy: {
    minLikes: number;
  };
};

type MinLikesParseResult =
  | { ok: true; value: number }
  | { ok: false; message: string };

export function parsePopularPostMinLikesInput(value: string): MinLikesParseResult {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return {
      ok: false,
      message: "인기글 기준을 입력해 주세요.",
    };
  }

  const numericValue = Number(trimmedValue);
  if (!Number.isInteger(numericValue)) {
    return {
      ok: false,
      message: "좋아요 기준은 정수로 입력해 주세요.",
    };
  }

  if (
    numericValue < POPULAR_POST_MIN_LIKES_MIN ||
    numericValue > POPULAR_POST_MIN_LIKES_MAX
  ) {
    return {
      ok: false,
      message: `좋아요 기준은 ${POPULAR_POST_MIN_LIKES_MIN}~${POPULAR_POST_MIN_LIKES_MAX} 사이로 입력해 주세요.`,
    };
  }

  return { ok: true, value: numericValue };
}

export function PopularPostPolicyForm({
  initialPolicy,
}: PopularPostPolicyFormProps) {
  const [savedMinLikes, setSavedMinLikes] = useState(initialPolicy.minLikes);
  const [minLikesInput, setMinLikesInput] = useState(String(initialPolicy.minLikes));
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsedMinLikes = useMemo(
    () => parsePopularPostMinLikesInput(minLikesInput),
    [minLikesInput],
  );
  const hasChanged = parsedMinLikes.ok && parsedMinLikes.value !== savedMinLikes;
  const helperTextId = "popular-post-policy-min-likes-help";
  const errorId = "popular-post-policy-min-likes-error";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!parsedMinLikes.ok) {
      setError(parsedMinLikes.message);
      return;
    }

    if (!hasChanged) {
      setMessage(`현재 기준 좋아요 ${savedMinLikes.toLocaleString()}개 이상이 이미 적용 중입니다.`);
      return;
    }

    startTransition(async () => {
      const result = await updatePopularPostPolicyAction({ minLikes: parsedMinLikes.value });
      if (!result.ok) {
        setError(result.message);
        return;
      }

      setSavedMinLikes(parsedMinLikes.value);
      setMessage(
        `인기글 기준을 좋아요 ${parsedMinLikes.value.toLocaleString()}개 이상으로 저장했습니다.`,
      );
    });
  };

  return (
    <form className="flex max-w-[720px] flex-col gap-3" onSubmit={handleSubmit} noValidate>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-md border border-[#dbe6f6] bg-[#f8fbff] px-2.5 py-1 font-semibold text-[#315484]">
          현재 적용: 좋아요 {savedMinLikes.toLocaleString()}개 이상
        </span>
        {hasChanged ? (
          <span className="text-[#4f678d]">
            저장 후 좋아요 {parsedMinLikes.value.toLocaleString()}개 이상으로 변경됩니다.
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,240px)_auto] sm:items-end">
        <label className="flex flex-col gap-1 text-xs text-[#355988]">
          <span className="font-semibold">인기글 승격 기준</span>
          <span className="relative">
            <input
              data-testid="popular-post-policy-min-likes"
              type="number"
              inputMode="numeric"
              min={POPULAR_POST_MIN_LIKES_MIN}
              max={POPULAR_POST_MIN_LIKES_MAX}
              step={1}
              value={minLikesInput}
              onChange={(event) => {
                setMinLikesInput(event.target.value);
                setMessage(null);
                setError(null);
              }}
              disabled={isPending}
              aria-describedby={error ? `${helperTextId} ${errorId}` : helperTextId}
              aria-invalid={error ? "true" : undefined}
              className="tp-input-soft min-h-10 w-full bg-white px-3 py-2 pr-14 text-sm"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-[#6c82a6]">
              좋아요
            </span>
          </span>
        </label>

        <button
          data-testid="popular-post-policy-submit"
          type="submit"
          disabled={isPending}
          className="tp-btn-primary min-h-10 w-full px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
        >
          {isPending ? "저장 중..." : "정책 저장"}
        </button>
      </div>

      <p id={helperTextId} className="max-w-[680px] text-xs leading-5 text-[#5a7398]">
        {POPULAR_POST_MIN_LIKES_MIN}~{POPULAR_POST_MIN_LIKES_MAX} 사이 정수만 저장할 수 있습니다.
        저장 후 새 좋아요 반응부터 승격 판정에 적용되며, 이미 승격된 글은 인기글에 남습니다.
      </p>

      {message ? (
        <p
          data-testid="popular-post-policy-success"
          className="text-xs text-emerald-700"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          data-testid="popular-post-policy-error"
          className="text-xs text-rose-600"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
