const KOREA_TIME_ZONE = "Asia/Seoul";

const koreanDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KOREA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const koreanMonthDayFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KOREA_TIME_ZONE,
  month: "numeric",
  day: "numeric",
});

const koreanDateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: KOREA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function toDate(value: Date | string | number) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function partsToMap(parts: Intl.DateTimeFormatPart[]) {
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function formatKoreanDate(value: Date | string | number) {
  const date = toDate(value);
  if (!date) {
    return "";
  }

  const parts = partsToMap(koreanDateFormatter.formatToParts(date));
  return `${parts.year}.${parts.month}.${parts.day}`;
}

export function formatKoreanMonthDay(value: Date | string | number) {
  const date = toDate(value);
  if (!date) {
    return "";
  }

  const parts = partsToMap(koreanMonthDayFormatter.formatToParts(date));
  return `${Number(parts.month)}.${Number(parts.day)}`;
}

export function formatKoreanDateTime(value: Date | string | number) {
  const date = toDate(value);
  if (!date) {
    return "";
  }

  const parts = partsToMap(koreanDateTimeFormatter.formatToParts(date));
  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
}
