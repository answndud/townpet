"use client";

import { PostType } from "@prisma/client";
import { useMemo, useState, useTransition } from "react";

import { updateGuestReadPolicyAction } from "@/server/actions/policy";
import { postTypeMeta } from "@/lib/post-presenter";

type GuestReadPolicyFormProps = {
  initialLoginRequiredTypes: PostType[];
};

export function GuestReadPolicyForm({
  initialLoginRequiredTypes,
}: GuestReadPolicyFormProps) {
  const [selected, setSelected] = useState<PostType[]>(initialLoginRequiredTypes);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedTypes = useMemo(() => Object.values(PostType), []);

  const isSelected = (value: PostType) => selected.includes(value);

  const toggle = (value: PostType) => {
    setSelected((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }
      return [...prev, value];
    });
  };

  const handleSubmit = () => {
    startTransition(async () => {
      setMessage(null);
      setError(null);
      const result = await updateGuestReadPolicyAction({
        loginRequiredTypes: selected,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setMessage("정책이 저장되었습니다.");
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {sortedTypes.map((type) => (
          <label
            key={type}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${
              isSelected(type)
                ? "border-[#3567b5] bg-[#eff5ff] text-[#12386c]"
                : "border-[#cbdcf5] bg-white text-[#355988] hover:bg-[#f5f9ff]"
            }`}
          >
            <input
              type="checkbox"
              className="accent-[#3567b5]"
              checked={isSelected(type)}
              onChange={() => toggle(type)}
              disabled={isPending}
            />
            <span className="font-semibold">{postTypeMeta[type].label}</span>
            <span className="text-[10px] text-[#6a82a7]">{type}</span>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="tp-btn-primary px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "저장 중..." : "정책 저장"}
        </button>
        <button
          type="button"
          onClick={() => {
            setSelected([]);
            setMessage(null);
            setError(null);
          }}
          disabled={isPending}
          className="tp-btn-soft px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-70"
        >
          모두 공개로 초기화
        </button>
      </div>

      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
