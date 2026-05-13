import Link from "next/link";

import { buildPaginationWindow } from "@/lib/pagination";

type CompactPaginationProps = {
  ariaLabel: string;
  currentPage: number;
  totalPages: number;
  makeHref: (page: number) => string;
  className?: string;
};

const compactPageLinkClass =
  "inline-flex min-h-10 items-center justify-center rounded-lg border text-xs font-semibold transition";

export function CompactPagination({
  ariaLabel,
  currentPage,
  totalPages,
  makeHref,
  className = "",
}: CompactPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      className={`tp-border-soft rounded-[20px] border bg-white px-3 py-3 ${className}`.trim()}
      aria-label={ariaLabel}
    >
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <Link
          href={makeHref(Math.max(1, currentPage - 1))}
          aria-disabled={currentPage <= 1}
          className={`${compactPageLinkClass} px-3 ${
            currentPage <= 1
              ? "tp-btn-disabled pointer-events-none"
              : "tp-btn-soft"
          }`}
        >
          이전
        </Link>
        {buildPaginationWindow(currentPage, totalPages).map((pageNumber) => (
          <Link
            key={`compact-page-${pageNumber}`}
            href={makeHref(pageNumber)}
            aria-current={pageNumber === currentPage ? "page" : undefined}
            className={`${compactPageLinkClass} min-w-10 px-3 ${
              pageNumber === currentPage ? "tp-btn-primary" : "tp-btn-soft"
            }`}
          >
            {pageNumber}
          </Link>
        ))}
        <Link
          href={makeHref(Math.min(totalPages, currentPage + 1))}
          aria-disabled={currentPage >= totalPages}
          className={`${compactPageLinkClass} px-3 ${
            currentPage >= totalPages
              ? "tp-btn-disabled pointer-events-none"
              : "tp-btn-soft"
          }`}
        >
          다음
        </Link>
      </div>
    </nav>
  );
}
