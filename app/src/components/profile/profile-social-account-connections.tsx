"use client";

import { useTransition } from "react";

import { getAuthProviderLabel } from "@/lib/social-auth";
import {
  buildSocialAccountLinkedNotice,
  buildSocialAccountUnlinkedNotice,
  getSocialAuthProviderLabel,
  type SocialAuthProvider,
} from "@/lib/social-auth";

type ProfileSocialAccountConnectionsProps = {
  authProvider?: string | null;
  hasPassword: boolean;
  linkedAccountProviders?: readonly string[];
  socialDevEnabled?: boolean;
};

function getLoginMethodDescription(authProvider?: string | null, hasPassword?: boolean) {
  const normalized = typeof authProvider === "string" ? authProvider.trim().toLowerCase() : "";

  if (!normalized || normalized === "credentials" || normalized === "email") {
    return hasPassword
      ? "이메일과 비밀번호로 로그인하는 계정입니다."
      : "이메일 로그인 계정입니다.";
  }

  return `${getAuthProviderLabel(authProvider)}로 로그인하는 계정입니다.`;
}

export function ProfileSocialAccountConnections({
  authProvider,
  hasPassword,
  linkedAccountProviders = [],
  socialDevEnabled = false,
}: ProfileSocialAccountConnectionsProps) {
  const [isPending, startTransition] = useTransition();
  const loginMethodLabel = getAuthProviderLabel(authProvider);
  const loginMethodDescription = getLoginMethodDescription(authProvider, hasPassword);
  const linkedProviders = new Set(linkedAccountProviders.map((provider) => provider.toLowerCase()));

  const handleConnect = (provider: SocialAuthProvider) => {
    startTransition(async () => {
      const response = await fetch("/api/auth/social-dev/link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider }),
      });

      if (!response.ok) {
        return;
      }

      window.location.assign(`/profile?notice=${buildSocialAccountLinkedNotice(provider)}`);
    });
  };

  const handleUnlink = (provider: SocialAuthProvider) => {
    if (!window.confirm(`${getSocialAuthProviderLabel(provider)} 로그인을 해제할까요?`)) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/auth/social-accounts/${provider}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        return;
      }

      window.location.assign(`/profile?notice=${buildSocialAccountUnlinkedNotice(provider)}`);
    });
  };

  return (
    <section className="tp-card p-5 sm:p-6" data-testid="profile-social-account-connections">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="tp-text-section-title text-[#153a6a]">로그인 수단</h2>
          <p className="mt-2 text-xs text-[#5a7398]">
            가입 또는 로그인할 때 선택한 방식으로 이 계정을 사용합니다.
          </p>
        </div>
        <div className="rounded-lg border border-[#dbe5f3] bg-[#f8fbff] px-3 py-2 text-right">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[#5d7aa3]">
            로그인 방식
          </div>
          <div className="mt-1 text-sm font-semibold text-[#1f3f71]">{loginMethodLabel}</div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-[#dbe5f3] bg-white px-4 py-3">
        <p className="text-sm font-semibold text-[#1f3f71]">{loginMethodLabel}</p>
        <p className="mt-1 text-xs text-[#5a7398]">{loginMethodDescription}</p>
      </div>

      {socialDevEnabled ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(["kakao", "naver"] as const).map((provider) => {
            const label = getSocialAuthProviderLabel(provider);
            const linked = linkedProviders.has(provider);
            const isLastLoginMethod = linked && !hasPassword && linkedProviders.size <= 1;

            return (
              <div
                key={provider}
                className="rounded-lg border border-[#dbe5f3] bg-[#f8fbff] px-4 py-3"
                data-testid={linked ? `profile-social-provider-linked-${provider}` : undefined}
              >
                <p className="text-sm font-semibold text-[#1f3f71]">{label}</p>
                <p className="mt-1 min-h-8 text-xs text-[#5a7398]">
                  {linked
                    ? `${label} 로그인이 연결되어 있습니다.`
                    : `${label} 로그인을 이 계정에 연결할 수 있습니다.`}
                </p>
                {linked ? (
                  <>
                    <button
                      type="button"
                      data-testid={`profile-social-unlink-${provider}`}
                      disabled={isPending || isLastLoginMethod}
                      onClick={() => handleUnlink(provider)}
                      className="mt-3 inline-flex min-h-9 items-center rounded-sm border border-[#d8e4f6] bg-white px-3 py-1.5 text-xs font-semibold text-[#315b9a] transition hover:bg-[#f3f7fd] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      해제
                    </button>
                    {isLastLoginMethod ? (
                      <p className="mt-2 text-[11px] font-medium text-amber-700">
                        유일한 로그인 수단은 해제할 수 없습니다.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <button
                    type="button"
                    data-testid={`profile-social-connect-${provider}`}
                    disabled={isPending}
                    onClick={() => handleConnect(provider)}
                    className="mt-3 inline-flex min-h-9 items-center rounded-sm bg-[#315b9a] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#254b82] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    연결하기
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
