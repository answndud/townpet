"use client";

import { resolveSafeRedirectPath } from "@/lib/redirect-path";
import type { SocialAuthProvider } from "@/lib/social-auth";

export const OAUTH_LINK_INTENT_KEY = "townpet:oauth-link-intent";

export type PendingOAuthLinkIntent = {
  provider: SocialAuthProvider;
  returnPath: string;
};

export function rememberPendingOAuthLinkIntent(intent: PendingOAuthLinkIntent) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(OAUTH_LINK_INTENT_KEY, JSON.stringify(intent));
}

export function readPendingOAuthLinkIntent(): PendingOAuthLinkIntent | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(OAUTH_LINK_INTENT_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PendingOAuthLinkIntent;
    const returnPath = resolveSafeRedirectPath(parsed?.returnPath, "");
    if (
      typeof parsed?.provider === "string" &&
      returnPath.length > 0
    ) {
      return {
        provider: parsed.provider,
        returnPath,
      };
    }
  } catch {
    // Ignore malformed client storage and clear it below.
  }

  window.sessionStorage.removeItem(OAUTH_LINK_INTENT_KEY);
  return null;
}

export function clearPendingOAuthLinkIntent() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(OAUTH_LINK_INTENT_KEY);
}
