import Link from "next/link";

import { buildPaginationWindow } from "@/lib/pagination";

type FeedPaginationProps = {
  resolvedPage: number;
  totalPages: number;
  makeHref: (params: { nextPage: number }) => string;
};

const pageLinkBaseClass =
  "inline-flex min-h-10 items-center justify-center rounded-md px-2 text-[11px] font-semibold leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1";

export function FeedPagination({
  resolvedPage,
  totalPages,
  makeHref,
}: FeedPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      className="border-t border-[#dbe6f6] bg-[#f8fbff] px-3 py-2"
      aria-label="피드 페이지 이동"
    >
      <div className="flex flex-wrap items-center justify-center gap-1">
        <Link
          href={makeHref({ nextPage: Math.max(1, resolvedPage - 1) })}
          aria-disabled={resolvedPage <= 1}
          className={`${pageLinkBaseClass} px-2.5 ${
            resolvedPage <= 1
              ? "pointer-events-none text-[#91a6c6]"
              : "tp-text-muted hover:text-[#2f5da4] hover:underline hover:underline-offset-4"
          }`}
        >
          이전
        </Link>
        {buildPaginationWindow(resolvedPage, totalPages).map((pageNumber) => (
          <Link
            key={`feed-page-${pageNumber}`}
            href={makeHref({ nextPage: pageNumber })}
            aria-current={pageNumber === resolvedPage ? "page" : undefined}
            className={`${pageLinkBaseClass} min-w-10 ${
              pageNumber === resolvedPage
                ? "bg-[#3567b5] text-[#fbfdff]"
                : "tp-text-muted hover:text-[#2f5da4] hover:underline hover:underline-offset-4"
            }`}
          >
            {pageNumber}
          </Link>
        ))}
        <Link
          href={makeHref({ nextPage: Math.min(totalPages, resolvedPage + 1) })}
          aria-disabled={resolvedPage >= totalPages}
          className={`${pageLinkBaseClass} px-2.5 ${
            resolvedPage >= totalPages
              ? "pointer-events-none text-[#91a6c6]"
              : "tp-text-muted hover:text-[#2f5da4] hover:underline hover:underline-offset-4"
          }`}
        >
          다음
        </Link>
      </div>
    </nav>
  );
}
