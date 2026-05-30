import { formatKoreanIsoDate } from "@/lib/date-format";
import { formatCount } from "@/lib/post-presenter";

export function getStableFeedDateLabel(isoDate: string) {
  return formatKoreanIsoDate(isoDate);
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
