const DAY_MS = 24 * 60 * 60 * 1000;

export const RECENT_SEARCHES_TTL_MS = 7 * DAY_MS;
export const MAX_RECENT_SEARCHES = 8;

const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const phonePattern = /\b(?:01[016789]|02|0[3-9][0-9])[-.\s]?\d{3,4}[-.\s]?\d{4}\b/;
const openKakaoPattern = /\bhttps?:\/\/open\.kakao\.com\/[^\s)]+/i;
const messengerLinkPattern = /\bhttps?:\/\/(?:t\.me|wa\.me|line\.me)\/[^\s)]+/i;
const kakaoIdPattern = /(카카오톡|카톡)\s*(아이디|id)?\s*[:：]?\s*([A-Za-z0-9._-]{3,20})/i;
const addressPattern =
  /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주|서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주특별자치도)\s+[가-힣A-Za-z0-9\s.-]{2,40}(?:로|길|동|읍|면)\s*\d{1,5}(?:-\d{1,5})?/;
const tokenPattern =
  /\b(?:Bearer\s+[A-Za-z0-9._~+/=-]{12,}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}|(?:sk|pk|rk|api[_-]?key)[_-]?[A-Za-z0-9]{16,})\b/i;

type RecentSearchesPayload = {
  savedAt: string;
  expiresAt: string;
  items: string[];
};

function parseDateMs(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

export function normalizeSearchTerm(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 2 || normalized.length > 100) {
    return null;
  }
  return normalized;
}

function hasSensitiveSignal(value: string) {
  return (
    emailPattern.test(value) ||
    phonePattern.test(value) ||
    openKakaoPattern.test(value) ||
    messengerLinkPattern.test(value) ||
    kakaoIdPattern.test(value) ||
    addressPattern.test(value) ||
    tokenPattern.test(value)
  );
}

export function normalizeRecentSearchTerm(value: string) {
  const normalized = normalizeSearchTerm(value);
  if (!normalized) {
    return null;
  }

  return hasSensitiveSignal(normalized) ? null : normalized;
}

export function buildRecentSearchesPayload(
  items: string[],
  now = new Date(),
): RecentSearchesPayload {
  return {
    savedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + RECENT_SEARCHES_TTL_MS).toISOString(),
    items: items
      .map((item) => normalizeRecentSearchTerm(item))
      .filter((item): item is string => Boolean(item))
      .slice(0, MAX_RECENT_SEARCHES),
  };
}

export function parseRecentSearches(raw: string | null, now = new Date()) {
  if (!raw) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    let items: unknown[] = [];
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as Partial<RecentSearchesPayload>).items)
    ) {
      items = (parsed as Partial<RecentSearchesPayload>).items ?? [];
    }
    const expiresAt = !Array.isArray(parsed)
      ? parseDateMs((parsed as Partial<RecentSearchesPayload>)?.expiresAt)
      : null;

    if (expiresAt !== null && expiresAt <= now.getTime()) {
      return [];
    }

    return items
      .filter((item): item is string => typeof item === "string")
      .map((item) => normalizeRecentSearchTerm(item))
      .filter((item): item is string => Boolean(item))
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

export function addRecentSearchTerm(prev: string[], rawValue: string, now = new Date()) {
  const term = normalizeRecentSearchTerm(rawValue);
  if (!term) {
    return {
      items: prev,
      payload: buildRecentSearchesPayload(prev, now),
      stored: false,
    };
  }

  const items = [term, ...prev.filter((item) => item !== term)].slice(0, MAX_RECENT_SEARCHES);
  return {
    items,
    payload: buildRecentSearchesPayload(items, now),
    stored: true,
  };
}
