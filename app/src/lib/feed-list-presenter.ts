import { formatCount, formatRelativeDate } from "@/lib/post-presenter";

export function getStableFeedDateLabel(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10).replace(/-/g, ".");
}

type BuildFeedMobileStatsLabelParams = {
  createdAt: string;
  relativeNow: number | null;
  viewCount: number;
  likeCount: number;
};

export function buildFeedStatsLabel({
  createdAt,
  relativeNow,
  viewCount,
  likeCount,
}: BuildFeedMobileStatsLabelParams) {
  const dateLabel =
    relativeNow === null
      ? getStableFeedDateLabel(createdAt)
      : formatRelativeDate(createdAt, relativeNow);

  return [dateLabel, `조회 ${formatCount(viewCount)}`, `좋아요 ${formatCount(likeCount)}`]
    .filter((part) => part.length > 0)
    .join(" · ");
}
