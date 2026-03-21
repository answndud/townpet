import { normalizeStoredText } from "@/lib/text-normalization";

const SEARCH_DOCUMENT_WHITESPACE_REGEX = /\s+/g;
const SEARCH_DOCUMENT_IGNORED_CHAR_REGEX = /[\s\p{P}\p{S}\p{Cf}]+/gu;
const HANGUL_SYLLABLE_START = 0xac00;
const HANGUL_SYLLABLE_END = 0xd7a3;
const HANGUL_INITIAL_INTERVAL = 21 * 28;
const HANGUL_INITIALS = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
] as const;
const COMPATIBILITY_CHOSEONG_REGEX = /[ㄱ-ㅎ]/;
const ALPHANUMERIC_REGEX = /[a-z0-9]/i;

export type SearchDocumentParts = {
  normalizedText: string;
  compactText: string;
  choseongText: string;
};

function normalizeSearchDocumentText(value: string) {
  return normalizeStoredText(value).replace(SEARCH_DOCUMENT_WHITESPACE_REGEX, " ").trim();
}

export function buildSearchCompactText(value: string) {
  return normalizeSearchDocumentText(value)
    .toLowerCase()
    .replace(SEARCH_DOCUMENT_IGNORED_CHAR_REGEX, "");
}

export function buildSearchChoseongText(value: string) {
  const compact = buildSearchCompactText(value);
  let result = "";

  for (const char of compact) {
    const codePoint = char.codePointAt(0);
    if (typeof codePoint !== "number") {
      continue;
    }

    if (codePoint >= HANGUL_SYLLABLE_START && codePoint <= HANGUL_SYLLABLE_END) {
      const initialIndex = Math.floor((codePoint - HANGUL_SYLLABLE_START) / HANGUL_INITIAL_INTERVAL);
      result += HANGUL_INITIALS[initialIndex] ?? "";
      continue;
    }

    if (COMPATIBILITY_CHOSEONG_REGEX.test(char) || ALPHANUMERIC_REGEX.test(char)) {
      result += char.toLowerCase();
    }
  }

  return result;
}

export function buildSearchDocumentParts(
  value: string | Array<string | null | undefined>,
): SearchDocumentParts {
  const joined = Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .join(" ")
    : value;
  const normalizedText = normalizeSearchDocumentText(joined);

  return {
    normalizedText,
    compactText: buildSearchCompactText(normalizedText),
    choseongText: buildSearchChoseongText(normalizedText),
  };
}

export function hasChoseongSearchSignal(value: string) {
  const normalized = normalizeSearchDocumentText(value);
  return COMPATIBILITY_CHOSEONG_REGEX.test(normalized);
}

export function matchesSearchDocumentQuery(
  candidate: string | SearchDocumentParts,
  query: string | SearchDocumentParts,
) {
  const candidateParts =
    typeof candidate === "string" ? buildSearchDocumentParts(candidate) : candidate;
  const queryParts = typeof query === "string" ? buildSearchDocumentParts(query) : query;

  if (!queryParts.normalizedText) {
    return false;
  }

  if (candidateParts.normalizedText.toLowerCase().includes(queryParts.normalizedText.toLowerCase())) {
    return true;
  }
  if (queryParts.compactText && candidateParts.compactText.includes(queryParts.compactText)) {
    return true;
  }
  if (queryParts.choseongText && candidateParts.choseongText.includes(queryParts.choseongText)) {
    return true;
  }

  return false;
}

export function resolveSearchDocumentMatchRank(
  candidate: string | SearchDocumentParts,
  query: string | SearchDocumentParts,
) {
  const candidateParts =
    typeof candidate === "string" ? buildSearchDocumentParts(candidate) : candidate;
  const queryParts = typeof query === "string" ? buildSearchDocumentParts(query) : query;
  const normalizedCandidate = candidateParts.normalizedText.toLowerCase();
  const normalizedQuery = queryParts.normalizedText.toLowerCase();

  if (normalizedQuery && normalizedCandidate.startsWith(normalizedQuery)) {
    return 0;
  }
  if (queryParts.compactText && candidateParts.compactText.startsWith(queryParts.compactText)) {
    return 1;
  }
  if (queryParts.choseongText && candidateParts.choseongText.startsWith(queryParts.choseongText)) {
    return 2;
  }
  if (matchesSearchDocumentQuery(candidateParts, queryParts)) {
    return 3;
  }

  return 4;
}
