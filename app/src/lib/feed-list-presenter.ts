import { formatKoreanIsoDate } from "@/lib/date-format";
import { formatCount } from "@/lib/post-presenter";

const FEED_SIGNAL_CONTENT_PREFIX_LENGTH = 240;
const FEED_SIGNAL_CONTENT_MAX_URLS = 12;
const URL_REGEX = /https?:\/\/[^\s)]+/gi;

export function getStableFeedDateLabel(isoDate: string) {
  return formatKoreanIsoDate(isoDate);
}

export function buildFeedSignalContent(content: string) {
  const trimmed = content.trim();
  if (trimmed.length <= FEED_SIGNAL_CONTENT_PREFIX_LENGTH) {
    return content;
  }

  const prefix = trimmed.slice(0, FEED_SIGNAL_CONTENT_PREFIX_LENGTH);
  const urls = Array.from(new Set(trimmed.match(URL_REGEX) ?? [])).slice(
    0,
    FEED_SIGNAL_CONTENT_MAX_URLS,
  );
  if (urls.length === 0) {
    return prefix;
  }

  return `${prefix}\n${urls.join("\n")}`;
}

type BuildFeedMobileStatsLabelParams = {
  createdAt: string;
  viewCount: number;
  likeCount: number;
  commentCount?: number;
};

export function buildFeedStatsLabel({
  createdAt,
  viewCount,
  likeCount,
  commentCount,
}: BuildFeedMobileStatsLabelParams) {
  const dateLabel = getStableFeedDateLabel(createdAt);
  const commentPart =
    commentCount !== undefined && commentCount > 0
      ? `댓글 ${formatCount(commentCount)}`
      : null;

  return [dateLabel, `조회 ${formatCount(viewCount)}`, `좋아요 ${formatCount(likeCount)}`, commentPart]
    .filter((part): part is string => Boolean(part && part.length > 0))
    .join(" · ");
}
