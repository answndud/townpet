"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { getPasswordSetupCopy, validatePasswordSetupForm } from "@/lib/password-setup";

type SetPasswordFormProps = {
  hasPassword: boolean;
};

export function SetPasswordForm({ hasPassword }: SetPasswordFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const copy = getPasswordSetupCopy(hasPassword);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const validationError = validatePasswordSetupForm({
      hasPassword,
      currentPassword,
      password,
      passwordConfirm,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/auth/password/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentPassword || undefined,
          password,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error?.message ?? "비밀번호 수정에 실패했습니다.");
        return;
      }

      setSuccess(true);
      setCurrentPassword("");
      setPassword("");
      setPasswordConfirm("");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {hasPassword ? (
        <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
          {copy.currentPasswordLabel}
          <input
            type="password"
            autoComplete="current-password"
            className="tp-input-soft min-h-11 px-3 py-2 text-sm placeholder:text-[#6887b2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/40"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder={copy.currentPasswordPlaceholder}
            required
            aria-invalid={Boolean(error)}
          />
        </label>
      ) : null}
      <p className="text-xs leading-5 text-[#5a7398]">{copy.currentPasswordHint}</p>
      {hasPassword ? (
        <p className="text-xs leading-5 text-[#5a7398]">
          현재 비밀번호를 잊었다면{" "}
          <Link
            href="/password/reset"
            className="font-medium text-[#315b9a] underline-offset-2 hover:text-[#1f3f71] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/35"
          >
            이메일로 초기화
          </Link>
          를 사용해 주세요.
        </p>
      ) : null}
      <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
        새 비밀번호
        <input
          type="password"
          autoComplete="new-password"
          className="tp-input-soft min-h-11 px-3 py-2 text-sm placeholder:text-[#6887b2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/40"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="최소 8자"
          required
          aria-invalid={Boolean(error)}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
        새 비밀번호 확인
        <input
          type="password"
          autoComplete="new-password"
          className="tp-input-soft min-h-11 px-3 py-2 text-sm placeholder:text-[#6887b2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/40"
          value={passwordConfirm}
          onChange={(event) => setPasswordConfirm(event.target.value)}
          placeholder="다시 입력"
          required
          aria-invalid={Boolean(error)}
        />
      </label>
      {error ? (
        <p className="text-xs font-medium text-rose-700" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}
      {success ? (
        <div className="flex flex-col gap-2 rounded-lg border border-[#cfe7d7] bg-[#f7fff9] px-3 py-2 text-xs font-medium text-emerald-700 sm:flex-row sm:items-center sm:justify-between">
          <span>{copy.successMessage}</span>
          <Link
            href="/profile"
            className="inline-flex min-h-9 items-center rounded-md text-xs text-[#315b9a] underline-offset-2 hover:text-[#1f3f71] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/35"
          >
            프로필로 이동
          </Link>
        </div>
      ) : null}
      <button
        type="submit"
        className="tp-btn-primary min-h-11 px-5 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/40 disabled:cursor-not-allowed disabled:border-[#9fb9e0] disabled:bg-[#9fb9e0]"
        disabled={isPending}
      >
        {isPending ? "저장 중..." : copy.submitLabel}
      </button>
    </form>
  );
}
