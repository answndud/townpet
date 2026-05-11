import { buildStructuredSearchVariants } from "@/lib/structured-field-normalization";

type SensitiveSearchSignalType =
  | "email"
  | "phone"
  | "open_kakao"
  | "messenger_link"
  | "kakao_id"
  | "address"
  | "token";

export type SearchTermSkipReason = "INVALID_TERM" | "SENSITIVE_TERM";

const TRACKABLE_TERM_MIN_LENGTH = 2;
const TRACKABLE_TERM_MAX_LENGTH = 50;
const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const phonePattern = /\b(?:01[016789]|02|0[3-9][0-9])[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g;
const openKakaoPattern = /\bhttps?:\/\/open\.kakao\.com\/[^\s)]+/gi;
const messengerLinkPattern = /\bhttps?:\/\/(?:t\.me|wa\.me|line\.me)\/[^\s)]+/gi;
const kakaoIdPattern = /(카카오톡|카톡)\s*(아이디|id)?\s*[:：]?\s*([A-Za-z0-9._-]{3,20})/gi;
const addressPattern =
  /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주|서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주특별자치도)\s+[가-힣A-Za-z0-9\s.-]{2,40}(?:로|길|동|읍|면)\s*\d{1,5}(?:-\d{1,5})?/g;
const bearerTokenPattern = /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/gi;
const jwtPattern = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
const apiKeyPattern = /\b(?:sk|pk|rk|api[_-]?key)[_-]?[A-Za-z0-9]{16,}\b/gi;

export function normalizeSearchTerm(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (
    normalized.length < TRACKABLE_TERM_MIN_LENGTH ||
    normalized.length > TRACKABLE_TERM_MAX_LENGTH
  ) {
    return null;
  }

  return normalized;
}

function hasPattern(text: string, pattern: RegExp) {
  return pattern.test(text);
}

export function buildSearchTermStatVariants(value: string) {
  const normalized = normalizeSearchTerm(value);
  if (!normalized) {
    return [] as string[];
  }

  return Array.from(
    new Set(
      [normalized, ...buildStructuredSearchVariants(normalized)]
        .map((item) => normalizeSearchTerm(item))
        .filter((item): item is string => Boolean(item)),
    ),
  );
}

export function normalizeSearchTermForStats(value: string) {
  const variants = buildSearchTermStatVariants(value);
  if (variants.length === 0) {
    return null;
  }

  return variants.find((item) => item !== variants[0]) ?? variants[0]!;
}

export function detectSensitiveSearchSignals(value: string) {
  const normalized = normalizeSearchTermForStats(value);
  if (!normalized) {
    return [] as SensitiveSearchSignalType[];
  }

  const signals = new Set<SensitiveSearchSignalType>();
  if (hasPattern(normalized, new RegExp(emailPattern.source, "g"))) {
    signals.add("email");
  }
  if (hasPattern(normalized, new RegExp(phonePattern.source, "g"))) {
    signals.add("phone");
  }
  if (hasPattern(normalized, new RegExp(openKakaoPattern.source, "gi"))) {
    signals.add("open_kakao");
  }
  if (hasPattern(normalized, new RegExp(messengerLinkPattern.source, "gi"))) {
    signals.add("messenger_link");
  }
  if (hasPattern(normalized, new RegExp(kakaoIdPattern.source, "gi"))) {
    signals.add("kakao_id");
  }
  if (hasPattern(normalized, new RegExp(addressPattern.source, "g"))) {
    signals.add("address");
  }
  if (
    hasPattern(normalized, new RegExp(bearerTokenPattern.source, "gi")) ||
    hasPattern(normalized, new RegExp(jwtPattern.source, "g")) ||
    hasPattern(normalized, new RegExp(apiKeyPattern.source, "gi"))
  ) {
    signals.add("token");
  }

  return Array.from(signals);
}

export function redactSensitiveSearchTerm(value: string) {
  const normalized = normalizeSearchTerm(value);
  if (!normalized) {
    return null;
  }

  return normalized
    .replace(emailPattern, "[이메일 비공개]")
    .replace(phonePattern, "[연락처 비공개]")
    .replace(openKakaoPattern, "[오픈채팅 링크 비공개]")
    .replace(messengerLinkPattern, "[메신저 링크 비공개]")
    .replace(kakaoIdPattern, "$1 아이디: [비공개]")
    .replace(addressPattern, "[상세주소 비공개]")
    .replace(bearerTokenPattern, "[토큰 비공개]")
    .replace(jwtPattern, "[토큰 비공개]")
    .replace(apiKeyPattern, "[토큰 비공개]")
    .trim()
    .replace(/\s+/g, " ");
}

function hasSearchableTextOutsideRedactions(value: string) {
  const stripped = value.replace(/\[[^\]]+ 비공개\]/g, "").trim();
  return /[가-힣A-Za-z0-9]{2,}/.test(stripped);
}

export function sanitizeSearchTermForStats(value: string) {
  const redacted = redactSensitiveSearchTerm(value);
  if (!redacted) {
    return null;
  }
  if (detectSensitiveSearchSignals(value).length > 0 && !hasSearchableTextOutsideRedactions(redacted)) {
    return null;
  }
  return normalizeSearchTermForStats(redacted);
}

export function shouldExcludeSearchTermFromStats(value: string) {
  return detectSensitiveSearchSignals(value).length > 0;
}
