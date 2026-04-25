"use client";

import { useState, useTransition } from "react";

import { FEED_PERSONALIZATION_AD_SIGNAL_CAP_MAX } from "@/lib/feed-personalization-policy";
import { updateFeedPersonalizationPolicyAction } from "@/server/actions/policy";

type FeedPersonalizationPolicyFormProps = {
  initialPolicy: {
    recencyDecayStep: number;
    recencyDecayFloor: number;
    personalizedRatio: number;
    personalizedThreshold: number;
    clickSignalMultiplier: number;
    clickSignalCap: number;
    adSignalMultiplier: number;
    adSignalCap: number;
    dwellSignalMultiplier: number;
    dwellSignalCap: number;
    bookmarkSignalMultiplier: number;
    bookmarkSignalCap: number;
  };
};

export function FeedPersonalizationPolicyForm({
  initialPolicy,
}: FeedPersonalizationPolicyFormProps) {
  const [policy, setPolicy] = useState(initialPolicy);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof typeof initialPolicy>(key: K, value: number) => {
    setPolicy((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    startTransition(async () => {
      setMessage(null);
      setError(null);

      const result = await updateFeedPersonalizationPolicyAction(policy);
      if (!result.ok) {
        setError(result.message);
        return;
      }

      setMessage("개인화 튜닝 정책이 저장되었습니다.");
    });
  };

  const decimalInput = (
    key: keyof typeof initialPolicy,
    label: string,
    min: number,
    max: number,
    step = 0.01,
  ) => (
    <label className="flex flex-col gap-1 text-xs text-[#355988]">
      <span className="font-semibold">{label}</span>
      <input
        data-testid={`feed-personalization-policy-${key}`}
        type="number"
        min={min}
        max={max}
        step={step}
        value={policy[key]}
        onChange={(event) => updateField(key, Number(event.target.value))}
        disabled={isPending}
        className="tp-input-soft bg-white px-3 py-2 text-sm"
      />
    </label>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {decimalInput("recencyDecayStep", "recency 감쇠 계수", 0.01, 0.4)}
        {decimalInput("recencyDecayFloor", "recency 최소 가중치", 0, 1)}
        {decimalInput("personalizedRatio", "개인화 비율", 0.35, 0.85)}
        {decimalInput("personalizedThreshold", "개인화 분류 임계치", 0, 0.4)}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {decimalInput("clickSignalMultiplier", "클릭 신호 multiplier", 0, 3)}
        {decimalInput("clickSignalCap", "클릭 신호 cap", 0, 0.3)}
        {decimalInput("adSignalMultiplier", "광고 신호 multiplier", 0, 3)}
        {decimalInput("adSignalCap", "광고 신호 cap", 0, FEED_PERSONALIZATION_AD_SIGNAL_CAP_MAX)}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {decimalInput("dwellSignalMultiplier", "체류 신호 multiplier", 0, 3)}
        {decimalInput("dwellSignalCap", "체류 신호 cap", 0, 0.35)}
        {decimalInput("bookmarkSignalMultiplier", "북마크 신호 multiplier", 0, 3)}
        {decimalInput("bookmarkSignalCap", "북마크 신호 cap", 0, 0.35)}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          data-testid="feed-personalization-policy-submit"
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="tp-btn-primary px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "저장 중..." : "정책 저장"}
        </button>
      </div>

      {message ? (
        <p data-testid="feed-personalization-policy-success" className="text-xs text-emerald-700">
          {message}
        </p>
      ) : null}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
