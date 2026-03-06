const LOCAL_UPLOAD_PREFIX = "/uploads/";
const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

function normalizeUploadPathname(pathname: string) {
  const trimmed = pathname.trim();
  if (!trimmed) {
    return "";
  }

  const normalized = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  if (!normalized.startsWith("uploads/")) {
    return "";
  }

  if (
    normalized.includes("..") ||
    normalized.includes("\\") ||
    normalized.includes("?") ||
    normalized.includes("#") ||
    normalized.endsWith("/")
  ) {
    return "";
  }

  return normalized;
}

export function isTrustedUploadPathname(pathname: string) {
  return normalizeUploadPathname(pathname).length > 0;
}

export function isTrustedUploadUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed.startsWith(LOCAL_UPLOAD_PREFIX)) {
    return isTrustedUploadPathname(trimmed);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") {
    return false;
  }

  if (!parsed.hostname.toLowerCase().endsWith(BLOB_HOST_SUFFIX)) {
    return false;
  }

  return isTrustedUploadPathname(parsed.pathname);
}
