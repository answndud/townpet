"use client";

import { buildPaginationItems } from "@/components/posts/post-comment-thread-presenter";

type PostCommentPaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => Promise<void>;
};

export function PostCommentPagination({
  currentPage,
  totalPages,
  onPageChange,
}: PostCommentPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pageItems = buildPaginationItems(currentPage, totalPages);

  return (
    <div className="tp-text-muted mt-2 flex flex-wrap items-center justify-center gap-1 text-xs">
      <button
        type="button"
        className={`inline-flex min-h-10 items-center justify-center rounded-lg px-2.5 text-xs font-semibold ${currentPage <= 1 ? "tp-btn-disabled" : "tp-btn-soft"}`}
        onClick={() => void onPageChange?.(Math.max(1, currentPage - 1))}
        disabled={currentPage <= 1}
      >
        이전
      </button>
      {pageItems.map((item, index) =>
        item === "..." ? (
          <span key={`bottom-ellipsis-${index}`} className="tp-text-placeholder px-0.5">
            ...
          </span>
        ) : (
          <button
            key={`bottom-${item}`}
            type="button"
            className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg px-3 text-xs font-semibold ${item === currentPage ? "tp-btn-primary" : "tp-btn-soft"}`}
            onClick={() => void onPageChange?.(item)}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        className={`inline-flex min-h-10 items-center justify-center rounded-lg px-2.5 text-xs font-semibold ${currentPage >= totalPages ? "tp-btn-disabled" : "tp-btn-soft"}`}
        onClick={() => void onPageChange?.(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage >= totalPages}
      >
        다음
      </button>
    </div>
  );
}
