"use client";

import { useState, useTransition } from "react";

import { updatePopularPostPolicyAction } from "@/server/actions/policy";

type PopularPostPolicyFormProps = {
  initialPolicy: {
    minLikes: number;
  };
};

export function PopularPostPolicyForm({
  initialPolicy,
}: PopularPostPolicyFormProps) {
  const [minLikes, setMinLikes] = useState(initialPolicy.minLikes);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    startTransition(async () => {
      setMessage(null);
      setError(null);

      const result = await updatePopularPostPolicyAction({ minLikes });
      if (!result.ok) {
        setError(result.message);
        return;
      }

      setMessage("인기글 정책이 저장되었습니다.");
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="flex max-w-[240px] flex-col gap-1 text-xs text-[#355988]">
        <span className="font-semibold">인기글 승격 좋아요 수</span>
        <input
          data-testid="popular-post-policy-min-likes"
          type="number"
          min={1}
          max={100}
          step={1}
          value={minLikes}
          onChange={(event) => setMinLikes(Number(event.target.value))}
          disabled={isPending}
          className="tp-input-soft bg-white px-3 py-2 text-sm"
        />
      </label>

      <p className="max-w-[680px] text-xs leading-5 text-[#5a7398]">
        게시글 좋아요 수가 이 값 이상이 되는 순간 인기글로 승격됩니다. 승격된 글은
        날짜 필터 없이 인기글 목록에 계속 남습니다.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          data-testid="popular-post-policy-submit"
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="tp-btn-primary min-h-10 px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "저장 중..." : "정책 저장"}
        </button>
      </div>

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
        <p className="text-xs text-rose-600" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  );
}
