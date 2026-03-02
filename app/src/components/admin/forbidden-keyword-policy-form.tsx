"use client";

import { useMemo, useState, useTransition } from "react";

import { updateForbiddenKeywordPolicyAction } from "@/server/actions/policy";

type ForbiddenKeywordPolicyFormProps = {
  initialKeywords: string[];
};

function parseKeywordInput(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\r?\n|,/g)
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.length > 0),
    ),
  );
}

export function ForbiddenKeywordPolicyForm({
  initialKeywords,
}: ForbiddenKeywordPolicyFormProps) {
  const [rawKeywords, setRawKeywords] = useState(initialKeywords.join("\n"));
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsedKeywords = useMemo(
    () => parseKeywordInput(rawKeywords),
    [rawKeywords],
  );

  const handleSubmit = () => {
    startTransition(async () => {
      setMessage(null);
      setError(null);
      const result = await updateForbiddenKeywordPolicyAction({
        keywords: parsedKeywords,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setMessage("금칙어 정책이 저장되었습니다.");
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <textarea
        className="tp-input-soft min-h-[170px] px-3 py-2 text-xs"
        value={rawKeywords}
        onChange={(event) => setRawKeywords(event.target.value)}
        placeholder="한 줄에 하나씩 금칙어를 입력하세요. (쉼표 구분도 가능)"
        disabled={isPending}
      />
      <p className="text-xs text-[#5a7398]">
        총 {parsedKeywords.length}개. 게시글 제목/본문, 댓글 본문에 매칭되면 저장이 차단됩니다.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="tp-btn-primary px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "저장 중..." : "금칙어 저장"}
        </button>
        <button
          type="button"
          onClick={() => {
            setRawKeywords("");
            setMessage(null);
            setError(null);
          }}
          disabled={isPending}
          className="tp-btn-soft px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-70"
        >
          모두 삭제
        </button>
      </div>

      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
