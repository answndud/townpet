"use client";

import Link from "next/link";
import { ReportReason, ReportTarget } from "@prisma/client";
import { useState, useTransition } from "react";

import { getClientFingerprint } from "@/lib/guest-client";
import { REPORT_DESCRIPTION_MAX_LENGTH } from "@/lib/input-limits";
import { getReportReasonLabel, reportReasonOptions } from "@/lib/report-reason";
import { getReportTargetLabel } from "@/lib/report-target";

type PostReportFormProps = {
  targetId: string;
  targetType?: ReportTarget;
  canReport?: boolean;
  loginHref?: string;
};

export function PostReportForm({
  targetId,
  targetType = ReportTarget.POST,
  canReport = true,
  loginHref = "/login",
}: PostReportFormProps) {
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState<ReportReason>(ReportReason.SPAM);
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const targetLabel = getReportTargetLabel(targetType);

  if (!canReport) {
    return (
      <div className="tp-border-soft tp-surface-alt tp-text-accent rounded-lg border px-3 py-2 text-xs">
        로그인 후 {targetLabel} 신고 가능.{" "}
        <Link
          href={loginHref}
          className="tp-text-link inline-flex min-h-10 items-center font-semibold underline underline-offset-2"
        >
          로그인하기
        </Link>
      </div>
    );
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-fingerprint": getClientFingerprint(),
        },
        body: JSON.stringify({
          targetType,
          targetId,
          reason,
          description: description.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        setMessage({
          tone: "error",
          text: payload?.error?.message ?? "신고에 실패했습니다.",
        });
        return;
      }

      setDescription("");
      setMessage({ tone: "success", text: "신고가 접수되었습니다." });
    });
  };

  return (
    <form
      data-testid={`report-form-${targetType.toLowerCase()}-${targetId}`}
      onSubmit={handleSubmit}
      className="space-y-3"
    >
      <div className="grid gap-2">
        <label className="tp-text-accent flex flex-col gap-1 text-[11px] font-semibold">
          <span>사유</span>
          <select
            data-testid={`report-reason-${targetType.toLowerCase()}-${targetId}`}
            className="tp-input-soft min-h-10 px-3 text-[13px]"
            value={reason}
            onChange={(event) =>
              setReason(event.target.value as ReportReason)
            }
          >
            {reportReasonOptions.map((value) => (
              <option key={value} value={value}>
                {getReportReasonLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="tp-text-accent flex flex-col gap-1 text-[11px] font-semibold">
          <span>추가 설명</span>
          <textarea
            data-testid={`report-description-${targetType.toLowerCase()}-${targetId}`}
            className="tp-input-soft min-h-[72px] px-3 py-2 text-[13px]"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={REPORT_DESCRIPTION_MAX_LENGTH}
            placeholder="필요할 때만 입력"
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-2">
        {message ? (
          <p
            data-testid={`report-message-${targetType.toLowerCase()}-${targetId}`}
            className={
              message.tone === "error"
                ? "text-[11px] font-medium text-rose-700"
                : "text-[11px] font-medium text-emerald-700"
            }
            role={message.tone === "error" ? "alert" : "status"}
            aria-live="polite"
          >
            {message.text}
          </p>
        ) : <span />}
        <button
          data-testid={`report-submit-${targetType.toLowerCase()}-${targetId}`}
          type="submit"
          className="tp-btn-soft inline-flex min-h-10 items-center justify-center rounded-lg border-rose-300 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-[#d5dfee] disabled:text-[#9fb2cf]"
          disabled={isPending}
        >
          {isPending ? "접수 중..." : "신고"}
        </button>
      </div>
    </form>
  );
}
