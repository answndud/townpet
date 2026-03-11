const CRLF_REGEX = /\r\n?/g;
const FORMAT_CONTROL_REGEX = /[\p{Cf}\u00AD]+/gu;
const COMPACT_MODERATION_REGEX = /[\s\p{P}\p{S}\p{Cf}]+/gu;

export function normalizeStoredText(value: string) {
  return value.replace(CRLF_REGEX, "\n").normalize("NFC");
}

export function normalizeModerationText(value: string) {
  return normalizeStoredText(value).normalize("NFKC").replace(FORMAT_CONTROL_REGEX, "");
}

export function compactModerationText(value: string) {
  return normalizeModerationText(value).replace(COMPACT_MODERATION_REGEX, "");
}
