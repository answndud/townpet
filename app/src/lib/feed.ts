import { shouldStripPageParam } from "@/lib/pagination";

export const FEED_PAGE_SIZE = 15;

export function shouldStripFeedPageParam({
  page,
}: {
  page?: string | null;
}) {
  return shouldStripPageParam(page);
}
