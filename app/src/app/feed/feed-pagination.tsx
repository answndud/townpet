import Link from "next/link";

import { buildPaginationWindow } from "@/lib/pagination";

type FeedPaginationProps = {
  resolvedPage: number;
  totalPages: number;
  makeHref: (params: { nextPage: number }) => string;
};

export function FeedPagination({
  resolvedPage,
  totalPages,
  makeHref,
}: FeedPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 border-t border-[#dbe6f6] bg-[#f8fbff] px-3 py-3">
      <Link
        href={makeHref({ nextPage: Math.max(1, resolvedPage - 1) })}
        aria-disabled={resolvedPage <= 1}
        className={`inline-flex h-8 items-center border px-2.5 text-xs font-semibold transition ${
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
          className={`inline-flex h-8 min-w-8 items-center justify-center border px-2 text-xs font-semibold transition ${
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
        className={`inline-flex h-8 items-center border px-2.5 text-xs font-semibold transition ${
          resolvedPage >= totalPages
            ? "pointer-events-none border-[#d6e1f1] bg-[#eef3fb] text-[#91a6c6]"
            : "border-[#cbdcf5] bg-white text-[#315b9a] hover:bg-[#f5f9ff]"
        }`}
      >
        다음
      </Link>
    </div>
  );
}
