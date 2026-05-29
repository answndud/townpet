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
  const baseButtonClassName =
    "inline-flex min-h-10 items-center justify-center px-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1";
  const pageButtonBaseClassName = `${baseButtonClassName} min-w-10`;
  const enabledButtonClassName =
    "tp-text-muted hover:bg-[#f6f9fe] hover:text-[#2f5da4]";
  const disabledButtonClassName =
    "cursor-not-allowed text-[#9aacbf] opacity-60";
  const selectedButtonClassName =
    "bg-[#eef5ff] text-[#173963]";

  return (
    <div className="tp-text-muted mt-2 flex flex-wrap items-center justify-center gap-1 text-xs">
      <button
        type="button"
        className={`${baseButtonClassName} ${currentPage <= 1 ? disabledButtonClassName : enabledButtonClassName}`}
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
            className={`${pageButtonBaseClassName} ${item === currentPage ? selectedButtonClassName : enabledButtonClassName}`}
            onClick={() => void onPageChange?.(item)}
            aria-current={item === currentPage ? "page" : undefined}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        className={`${baseButtonClassName} ${currentPage >= totalPages ? disabledButtonClassName : enabledButtonClassName}`}
        onClick={() => void onPageChange?.(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage >= totalPages}
      >
        다음
      </button>
    </div>
  );
}
