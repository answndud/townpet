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
const FUZZY_COMPACT_MIN_LENGTH = 4;
const FUZZY_COMPACT_MAX_LENGTH = 24;

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
  if (hasFuzzyCompactSearchMatch(candidateParts.compactText, queryParts.compactText)) {
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
  if (hasFuzzyCompactSearchMatch(candidateParts.compactText, queryParts.compactText)) {
    return 3;
  }
  if (matchesSearchDocumentQuery(candidateParts, queryParts)) {
    return 3;
  }

  return 4;
}

function hasFuzzyCompactSearchMatch(candidateCompact: string, queryCompact: string) {
  if (
    queryCompact.length < FUZZY_COMPACT_MIN_LENGTH ||
    queryCompact.length > FUZZY_COMPACT_MAX_LENGTH ||
    candidateCompact.length < queryCompact.length - 1
  ) {
    return false;
  }

  const windowLengths = Array.from(
    new Set([queryCompact.length - 1, queryCompact.length, queryCompact.length + 1]),
  ).filter((length) => length > 0 && length <= candidateCompact.length);

  for (const windowLength of windowLengths) {
    for (let index = 0; index <= candidateCompact.length - windowLength; index += 1) {
      const candidateWindow = candidateCompact.slice(index, index + windowLength);
      if (isWithinOneEdit(candidateWindow, queryCompact)) {
        return true;
      }
    }
  }

  return false;
}

function isWithinOneEdit(left: string, right: string) {
  if (left === right) {
    return true;
  }
  if (Math.abs(left.length - right.length) > 1) {
    return false;
  }

  let leftIndex = 0;
  let rightIndex = 0;
  let edits = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) {
      return false;
    }

    if (left.length > right.length) {
      leftIndex += 1;
    } else if (right.length > left.length) {
      rightIndex += 1;
    } else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }

  if (leftIndex < left.length || rightIndex < right.length) {
    edits += 1;
  }

  return edits <= 1;
}
