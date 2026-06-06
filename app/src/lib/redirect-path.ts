const REDIRECT_CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/;

export function resolveSafeRedirectPath(value: string | null | undefined, fallback = "/") {
  const safeFallback = normalizeSafeRedirectPath(fallback) ?? "/";
  const normalized = normalizeSafeRedirectPath(value);
  return normalized ?? safeFallback;
}

export function buildLoginRedirectPath(nextPath: string | null | undefined) {
  const safeNextPath = resolveSafeRedirectPath(nextPath, "/");
  const params = new URLSearchParams({ next: safeNextPath });

  return `/login?${params.toString()}`;
}

function normalizeSafeRedirectPath(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith("/")) {
    return null;
  }

  if (trimmed.startsWith("//") || trimmed.includes("\\") || REDIRECT_CONTROL_CHAR_PATTERN.test(trimmed)) {
    return null;
  }

  try {
    const parsed = new URL(trimmed, "https://townpet.local");
    if (parsed.origin !== "https://townpet.local" || !parsed.pathname.startsWith("/")) {
      return null;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
