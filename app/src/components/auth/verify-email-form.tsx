"use client";

import { useEffect, useRef, useState, useTransition } from "react";

type VerifyEmailFormProps = {
  initialToken?: string | null;
  initialEmail?: string | null;
};

export function VerifyEmailForm({
  initialToken,
  initialEmail,
}: VerifyEmailFormProps) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [token, setToken] = useState(initialToken ?? "");
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const autoVerifyAttemptedRef = useRef(false);

  useEffect(() => {
    if (!initialToken || success || autoVerifyAttemptedRef.current) {
      return;
    }

    autoVerifyAttemptedRef.current = true;
    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/auth/verify/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: initialToken }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error?.message ?? "인증에 실패했습니다.");
        return;
      }

      setSuccess(true);
    });
  }, [initialToken, startTransition, success]);

  const handleRequest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setRequestSuccess(false);
    setIssuedToken(null);

    startTransition(async () => {
      const response = await fetch("/api/auth/verify/request", {
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
      if (newToken && !initialToken) {
        setToken(newToken);
        setIssuedToken(newToken);
      }
      setRequestSuccess(true);
    });
  };

  const handleConfirm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/auth/verify/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error?.message ?? "인증에 실패했습니다.");
        return;
      }

      setSuccess(true);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleRequest} className="flex flex-col gap-3 border-b border-[#dbe6f6] pb-5">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-base font-semibold text-[#153a6a]">1. 인증 메일 받기</h2>
          <p className="text-xs leading-5 text-[#4f678d]">
            이메일 인증은 필수입니다. 메일이 오지 않으면 같은 주소로 다시 요청해 주세요.
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
        {requestSuccess ? (
          <p className="text-xs font-medium text-emerald-700" role="status" aria-live="polite">
            인증 메일을 다시 보냈습니다.
          </p>
        ) : null}
        {issuedToken ? (
          <div className="rounded-lg border border-[#dbe6f6] bg-[#f6f9ff] p-3 text-xs leading-5 text-[#4f678d]">
            발급된 토큰: <span className="font-mono break-all">{issuedToken}</span>
          </div>
        ) : null}
        <button
          type="submit"
          className="tp-btn-soft min-h-11 px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/40 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending || !email.trim()}
        >
          {isPending ? "발송 중..." : "인증 메일 보내기"}
        </button>
      </form>

      <form onSubmit={handleConfirm} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-base font-semibold text-[#153a6a]">2. 인증 토큰 입력</h2>
          <p className="text-xs leading-5 text-[#4f678d]">
            메일로 받은 토큰을 붙여 넣으면 계정 인증이 완료됩니다.
          </p>
        </div>
        <label className="flex flex-col gap-2 text-sm font-medium text-[#355988]">
          토큰
          <input
            className="tp-input-soft min-h-11 px-3 py-2 text-sm placeholder:text-[#6887b2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/40"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="메일로 받은 토큰을 입력"
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
          <p className="text-xs font-medium text-emerald-700" role="status" aria-live="polite">
            이메일 인증이 완료되었습니다. 이제 로그인할 수 있습니다.
          </p>
        ) : null}
        {isPending && initialToken && !success ? (
          <p className="text-xs text-[#5a7398]" role="status" aria-live="polite">
            인증 확인 중...
          </p>
        ) : null}
        <button
          type="submit"
          className="tp-btn-primary min-h-11 px-5 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f66ba]/40 disabled:cursor-not-allowed disabled:border-[#9fb9e0] disabled:bg-[#9fb9e0]"
          disabled={isPending || !token.trim()}
        >
          {isPending ? "확인 중..." : "인증 완료"}
        </button>
      </form>
    </div>
  );
}
