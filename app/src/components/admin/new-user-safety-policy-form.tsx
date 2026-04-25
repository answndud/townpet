"use client";

import { PostType } from "@prisma/client";
import { useActionState, useMemo, useState } from "react";

import { postTypeMeta } from "@/lib/post-presenter";
import { updateNewUserSafetyPolicyAction } from "@/server/actions/policy";
import type { PolicyActionResult } from "@/server/actions/policy";

const postTypes = new Set(Object.values(PostType));

function getPostTypeValues(formData: FormData, name: string) {
  return formData.getAll(name).filter(
    (value): value is PostType =>
      typeof value === "string" && postTypes.has(value as PostType),
  );
}

function getNumberValue(formData: FormData, name: string) {
  return Number(formData.get(name));
}

type NewUserSafetyPolicyFormProps = {
  initialPolicy: {
    minAccountAgeHours: number;
    restrictedPostTypes: PostType[];
    contactBlockWindowHours: number;
  };
};

export function NewUserSafetyPolicyForm({
  initialPolicy,
}: NewUserSafetyPolicyFormProps) {
  const [minAccountAgeHours, setMinAccountAgeHours] = useState(
    initialPolicy.minAccountAgeHours,
  );
  const [contactBlockWindowHours, setContactBlockWindowHours] = useState(
    initialPolicy.contactBlockWindowHours,
  );
  const [restrictedPostTypes, setRestrictedPostTypes] = useState<PostType[]>(
    initialPolicy.restrictedPostTypes,
  );
  const [result, submitAction, isPending] = useActionState<
    PolicyActionResult | null,
    FormData
  >(
    async (_previousState, formData) =>
      updateNewUserSafetyPolicyAction({
        minAccountAgeHours: getNumberValue(formData, "minAccountAgeHours"),
        restrictedPostTypes: getPostTypeValues(formData, "restrictedPostTypes"),
        contactBlockWindowHours: getNumberValue(formData, "contactBlockWindowHours"),
      }),
    null,
  );

  const sortedTypes = useMemo(() => Object.values(PostType), []);

  const toggleType = (postType: PostType) => {
    setRestrictedPostTypes((prev) => {
      if (prev.includes(postType)) {
        return prev.filter((item) => item !== postType);
      }
      return [...prev, postType];
    });
  };

  return (
    <form action={submitAction} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-[#355988]">
          <span className="font-semibold">고위험 카테고리 작성 제한 시간</span>
          <input
            data-testid="new-user-policy-min-account-age-hours"
            name="minAccountAgeHours"
            type="number"
            min={0}
            max={24 * 30}
            value={minAccountAgeHours}
            onChange={(event) => setMinAccountAgeHours(Number(event.target.value))}
            disabled={isPending}
            className="tp-input-soft bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[#355988]">
          <span className="font-semibold">연락처 포함 글/댓글 차단 시간</span>
          <input
            data-testid="new-user-policy-contact-block-window-hours"
            name="contactBlockWindowHours"
            type="number"
            min={0}
            max={24 * 30}
            value={contactBlockWindowHours}
            onChange={(event) => setContactBlockWindowHours(Number(event.target.value))}
            disabled={isPending}
            className="tp-input-soft bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-[#355988]">
          작성 제한 대상 카테고리
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sortedTypes.map((type) => (
            <label
              key={type}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${
                restrictedPostTypes.includes(type)
                  ? "border-[#3567b5] bg-[#eff5ff] text-[#12386c]"
                  : "border-[#cbdcf5] bg-white text-[#355988] hover:bg-[#f5f9ff]"
              }`}
            >
              <input
                data-testid={`new-user-policy-post-type-${type}`}
                name="restrictedPostTypes"
                value={type}
                type="checkbox"
                className="accent-[#3567b5]"
                checked={restrictedPostTypes.includes(type)}
                onChange={() => toggleType(type)}
                disabled={isPending}
              />
              <span className="font-semibold">{postTypeMeta[type].label}</span>
              <span className="text-[10px] text-[#6a82a7]">{type}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          data-testid="new-user-policy-submit"
          type="submit"
          disabled={isPending}
          className="tp-btn-primary px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "저장 중..." : "정책 저장"}
        </button>
      </div>

      {result?.ok ? (
        <p data-testid="new-user-policy-success" className="text-xs text-emerald-700">
          신규 계정 안전 정책이 저장되었습니다.
        </p>
      ) : null}
      {result && !result.ok ? <p className="text-xs text-rose-600">{result.message}</p> : null}
    </form>
  );
}
