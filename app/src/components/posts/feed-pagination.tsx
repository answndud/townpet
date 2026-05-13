import Link from "next/link";

import { buildPaginationWindow } from "@/lib/pagination";

type FeedPaginationProps = {
  resolvedPage: number;
  totalPages: number;
  makeHref: (params: { nextPage: number }) => string;
};

const pageLinkBaseClass =
  "inline-flex min-h-10 items-center justify-center border text-xs font-semibold transition";

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
      className="border-t border-[#dbe6f6] bg-[#f8fbff] px-3 py-3"
      aria-label="피드 페이지 이동"
    >
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <Link
          href={makeHref({ nextPage: Math.max(1, resolvedPage - 1) })}
          aria-disabled={resolvedPage <= 1}
          className={`${pageLinkBaseClass} px-3 ${
            resolvedPage <= 1
              ? "pointer-events-none border-[#d6e1f1] bg-[#eef3fb] text-[#91a6c6]"
              : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
          }`}
        >
          이전
        </Link>
        {buildPaginationWindow(resolvedPage, totalPages).map((pageNumber) => (
          <Link
            key={`feed-page-${pageNumber}`}
            href={makeHref({ nextPage: pageNumber })}
            aria-current={pageNumber === resolvedPage ? "page" : undefined}
            className={`${pageLinkBaseClass} min-w-10 px-2 ${
              pageNumber === resolvedPage
                ? "border-[#3567b5] bg-[#3567b5] text-white"
                : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
            }`}
          >
            {pageNumber}
          </Link>
        ))}
        <Link
          href={makeHref({ nextPage: Math.min(totalPages, resolvedPage + 1) })}
          aria-disabled={resolvedPage >= totalPages}
          className={`${pageLinkBaseClass} px-3 ${
            resolvedPage >= totalPages
              ? "pointer-events-none border-[#d6e1f1] bg-[#eef3fb] text-[#91a6c6]"
              : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
          }`}
        >
          다음
        </Link>
      </div>
    </nav>
  );
}
