import { formatKoreanIsoDate } from "@/lib/date-format";
import { formatCount } from "@/lib/post-presenter";

export function getStableFeedDateLabel(isoDate: string) {
  return formatKoreanIsoDate(isoDate);
}

type BuildFeedMobileStatsLabelParams = {
  createdAt: string;
  viewCount: number;
  likeCount: number;
};

export function buildFeedStatsLabel({
  createdAt,
  viewCount,
  likeCount,
}: BuildFeedMobileStatsLabelParams) {
  const dateLabel = getStableFeedDateLabel(createdAt);

  return [dateLabel, `조회 ${formatCount(viewCount)}`, `좋아요 ${formatCount(likeCount)}`]
    .filter((part) => part.length > 0)
    .join(" · ");
}
