import type { KeyboardEvent } from "react";

import { formatKoreanIsoDate } from "@/lib/date-format";

export const COMMENT_DIVIDER_CLASS_NAME = "divide-[#edf3fb]";
export const COMMENT_BORDER_CLASS_NAME = "border-[#eaf1fb]";
export const COMMENT_REPLY_BADGE_CLASS_NAME =
  "tp-text-muted inline-flex h-5 items-center rounded-md border border-[#e7eef9] bg-white px-1.5 text-[10px] font-medium";
export const MUTED_COMMENT_PLACEHOLDER_TEXT = "뮤트한 사용자 댓글입니다.";
export const MUTED_COMMENT_AUTHOR_NAME = "뮤트한 사용자";

export function formatCommentDate(value: Date | string) {
  return formatKoreanIsoDate(value);
}

export function buildPaginationItems(currentPage: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const normalized = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const items: Array<number | "..."> = [];

  for (const page of normalized) {
    const last = items[items.length - 1];
    if (typeof last === "number" && page - last > 1) {
      items.push("...");
    }
    items.push(page);
  }

  return items;
}

export function handleCommentSubmitShortcut(
  event: KeyboardEvent<HTMLTextAreaElement>,
  submit: () => void,
) {
  if (event.nativeEvent.isComposing) {
    return;
  }

  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    submit();
  }
}

export function ReactionStatIcon({ type }: { type: "LIKE" | "DISLIKE" }) {
  return type === "LIKE" ? (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M8 8V4.8A2.8 2.8 0 0 1 10.8 2l.5 3.1c.2 1-.1 2-.7 2.8L10 8.6h4.4A2.6 2.6 0 0 1 17 11.2l-.8 4.6a2.6 2.6 0 0 1-2.6 2.2H8z" />
      <path d="M3 8h3v10H3z" />
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 12v3.2A2.8 2.8 0 0 1 9.2 18l-.5-3.1c-.2-1 .1-2 .7-2.8l.6-.7H5.6A2.6 2.6 0 0 1 3 8.8l.8-4.6A2.6 2.6 0 0 1 6.4 2H12z" />
      <path d="M17 12h-3V2h3z" />
    </svg>
  );
}
