import Link from "next/link";

import { buildPaginationWindow } from "@/lib/pagination";

type FeedPaginationProps = {
  resolvedPage: number;
  totalPages: number;
  makeHref: (params: { nextPage: number }) => string;
};

const pageLinkBaseClass =
  "inline-flex min-h-7 min-w-7 items-center justify-center rounded-sm px-1.5 text-[12px] font-semibold leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f46e5]/20 focus-visible:ring-offset-1";

export function FeedPagination({
  resolvedPage,
  totalPages,
  makeHref,
}: FeedPaginationProps) {
  return (
    <nav
      className="border-t border-[#e4e7ec] bg-transparent px-3 py-1"
      aria-label="피드 페이지 이동"
    >
      <div className="flex flex-wrap items-center justify-center gap-1">
        <Link
          href={makeHref({ nextPage: Math.max(1, resolvedPage - 1) })}
          aria-disabled={resolvedPage <= 1}
          className={`${pageLinkBaseClass} px-2.5 ${
            resolvedPage <= 1
              ? "pointer-events-none text-[#98a2b3]"
              : "tp-text-muted hover:bg-[#f2f4f7] hover:text-[#4338ca]"
          }`}
        >
          &lt;
        </Link>
        {buildPaginationWindow(resolvedPage, totalPages).map((pageNumber) => (
          <Link
            key={`feed-page-${pageNumber}`}
            href={makeHref({ nextPage: pageNumber })}
            aria-current={pageNumber === resolvedPage ? "page" : undefined}
            className={`${pageLinkBaseClass} ${
              pageNumber === resolvedPage
                ? "bg-[#eef2ff] text-[#4338ca]"
                : "tp-text-muted hover:bg-[#f2f4f7] hover:text-[#4338ca]"
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
              ? "pointer-events-none text-[#98a2b3]"
              : "tp-text-muted hover:bg-[#f2f4f7] hover:text-[#4338ca]"
          }`}
        >
          &gt;
        </Link>
      </div>
    </nav>
  );
}
