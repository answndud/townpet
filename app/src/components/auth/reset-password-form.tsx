"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

type ResetPasswordFormProps = {
  initialToken?: string | null;
};

export function ResetPasswordForm({ initialToken }: ResetPasswordFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState(initialToken ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [issuedToken, setIssuedToken] = useState<string | null>(null);

  const handleRequest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setIssuedToken(null);
    setRequestSuccess(false);

    startTransition(async () => {
      const response = await fetch("/api/auth/password/reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error?.message ?? "요청에 실패했습니다.");
        return;
      }

      const data = await response.json().catch(() => null);
      const newToken = data?.data?.token ?? null;
      setIssuedToken(newToken);
      if (newToken && !initialToken) {
        setToken(newToken);
      }
      setRequestSuccess(true);
    });
  };

  const handleReset = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/auth/password/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error?.message ?? "재설정에 실패했습니다.");
        return;
      }

      setSuccess(true);
      setPassword("");
      setPasswordConfirm("");
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {initialToken ? (
        <div className="rounded-lg border border-[#dbe6f6] bg-[#f6f9ff] p-3 text-xs leading-5 text-[#4f678d]">
          메일에서 받은 토큰을 확인했습니다. 아래에서 새 비밀번호를 설정해 주세요.
        </div>
      ) : null}
      <form onSubmit={handleRequest} className="flex flex-col gap-3 border-b border-[#dbe6f6] pb-5">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-base font-semibold text-[#153a6a]">1. 재설정 토큰 받기</h2>
          <p className="text-xs leading-5 text-[#4f678d]">
            가입한 이메일로 토큰을 보냅니다. 개발 환경에서는 확인을 위해 토큰을 화면에도 표시합니다.
          </p>
        </div>
        <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
          이메일
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            spellCheck={false}
            className="tp-input-soft min-h-11 px-3 py-2 text-sm placeholder:text-[#6887b2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/40"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@townpet.dev"
            required
            aria-invalid={Boolean(error)}
          />
        </label>
        {issuedToken ? (
          <div className="rounded-lg border border-[#dbe6f6] bg-[#f6f9ff] p-3 text-xs leading-5 text-[#4f678d]">
            발급된 토큰: <span className="font-mono break-all">{issuedToken}</span>
          </div>
        ) : null}
        {requestSuccess ? (
          <p className="text-xs font-medium text-emerald-700" role="status" aria-live="polite">
            이메일을 확인해 주세요. 토큰을 받은 뒤 아래에 입력하면 됩니다.
          </p>
        ) : null}
        <button
          type="submit"
          className="tp-btn-soft min-h-11 px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/40 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending || !email.trim()}
        >
          {isPending ? "발급 중..." : "토큰 발급"}
        </button>
      </form>

      <form onSubmit={handleReset} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-base font-semibold text-[#153a6a]">2. 새 비밀번호 설정</h2>
          <p className="text-xs leading-5 text-[#4f678d]">
            토큰과 새 비밀번호를 입력하면 다음 로그인부터 변경된 비밀번호를 사용합니다.
          </p>
        </div>
        <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
          토큰
          <input
            className="tp-input-soft min-h-11 px-3 py-2 text-sm placeholder:text-[#6887b2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/40"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="토큰을 입력하세요"
            required
            aria-invalid={Boolean(error)}
          />
        </label>
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
            <span>비밀번호가 재설정되었습니다.</span>
            <Link
              href="/login"
              className="inline-flex min-h-9 items-center rounded-md text-xs text-[#315b9a] underline-offset-2 hover:text-[#1f3f71] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/35"
            >
              로그인으로 이동
            </Link>
          </div>
        ) : null}
        <button
          type="submit"
          className="tp-btn-primary min-h-11 px-5 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/40 disabled:cursor-not-allowed disabled:border-[#9fb9e0] disabled:bg-[#9fb9e0]"
          disabled={isPending || !token.trim() || !password || !passwordConfirm}
        >
          {isPending ? "재설정 중..." : "비밀번호 재설정"}
        </button>
      </form>
    </div>
  );
}
