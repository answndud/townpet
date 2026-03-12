const RESERVED_AUTH_EMAIL_LOCAL_PARTS = new Set([
  "admin",
  "administrator",
  "contact",
  "helpdesk",
  "info",
  "moderator",
  "official",
  "operator",
  "owner",
  "postmaster",
  "root",
  "security",
  "staff",
  "support",
  "system",
  "webmaster",
]);

export const RESERVED_AUTH_EMAIL_MESSAGE =
  "운영/대표 이메일은 가입에 사용할 수 없습니다. 개인 이메일을 사용해 주세요.";

function normalizeReservedAuthEmailLocalPart(value: string) {
  const trimmed = value.trim().toLowerCase();
  const [localPart = ""] = trimmed.split("@");
  const [baseLocalPart = ""] = localPart.split("+");

  return baseLocalPart.replace(/[._-]/g, "");
}

export function isReservedAuthEmail(value: string | null | undefined) {
  if (typeof value !== "string" || !value.includes("@")) {
    return false;
  }

  const normalizedLocalPart = normalizeReservedAuthEmailLocalPart(value);
  if (!normalizedLocalPart) {
    return false;
  }

  return RESERVED_AUTH_EMAIL_LOCAL_PARTS.has(normalizedLocalPart);
}
