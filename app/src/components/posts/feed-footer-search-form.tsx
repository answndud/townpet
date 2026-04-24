import Link from "next/link";
import type { PostType } from "@prisma/client";

import type { ReviewCategory } from "@/lib/review-category";

type FeedFooterSearchIn = "TITLE" | "CONTENT";

type FeedFooterSearchFormProps = {
  actionPath: string;
  query: string;
  searchIn: FeedFooterSearchIn;
  resetHref: string;
  type?: PostType | null;
  petTypeIds?: string[];
  reviewCategory?: ReviewCategory | null;
};

export function FeedFooterSearchForm({
  actionPath,
  query,
  searchIn,
  resetHref,
  type,
  petTypeIds = [],
  reviewCategory,
}: FeedFooterSearchFormProps) {
  return (
    <div className="border-t border-[#dbe6f6] bg-[#f8fbff] px-3 py-3 sm:px-4">
      <form
        action={actionPath}
        method="get"
        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end"
        aria-label="피드 하단 게시글 검색"
      >
        {type ? <input type="hidden" name="type" value={type} /> : null}
        {reviewCategory ? <input type="hidden" name="review" value={reviewCategory} /> : null}
        {petTypeIds.map((petTypeId) => (
          <input key={petTypeId} type="hidden" name="petType" value={petTypeId} />
        ))}

        <label className="sr-only" htmlFor="feed-footer-search-in">
          검색 위치
        </label>
        <select
          id="feed-footer-search-in"
          name="searchIn"
          defaultValue={searchIn}
          className="tp-input-soft min-h-10 px-2.5 text-xs font-medium outline-none transition focus:border-[#4e89d8] focus-visible:ring-2 focus-visible:ring-[#4e89d8]/25 sm:min-h-9"
        >
          <option value="TITLE">제목</option>
          <option value="CONTENT">내용</option>
        </select>

        <label className="sr-only" htmlFor="feed-footer-query">
          검색어
        </label>
        <input
          id="feed-footer-query"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="검색어"
          className="tp-input-soft min-h-10 w-full bg-white px-3 text-sm outline-none transition focus:border-[#4e89d8] focus-visible:ring-2 focus-visible:ring-[#4e89d8]/25 sm:min-h-9 sm:max-w-[360px]"
        />

        <button
          type="submit"
          className="tp-btn-primary inline-flex min-h-10 items-center justify-center px-4 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e89d8]/25 sm:min-h-9"
        >
          검색
        </button>

        {query.trim().length > 0 ? (
          <Link
            href={resetHref}
            className="tp-btn-soft inline-flex min-h-10 items-center justify-center px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4e89d8]/25 sm:min-h-9"
          >
            초기화
          </Link>
        ) : null}
      </form>
    </div>
  );
}
