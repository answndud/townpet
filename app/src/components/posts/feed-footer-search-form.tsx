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

const feedFooterSearchPrimaryActionClassName =
  "inline-flex min-h-10 min-w-[56px] items-center justify-center rounded-md bg-[#3567b5] px-2.5 text-[11px] font-semibold leading-none text-[#fbfdff] transition hover:bg-[#2f5da4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1";
const feedFooterSearchResetActionClassName =
  "tp-text-muted inline-flex min-h-10 min-w-[52px] items-center justify-center px-1.5 text-[11px] font-semibold leading-none transition hover:text-[#2f5da4] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1";

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
    <div className="border-t border-[#e4edf9] bg-[#fbfdff] px-2 py-2 sm:bg-white sm:px-3 sm:py-1">
      <form
        action={actionPath}
        method="get"
        className="grid grid-cols-[88px_minmax(0,1fr)_64px] gap-1 sm:flex sm:items-center sm:justify-end"
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
          className="tp-input-soft min-h-10 min-w-0 px-2 text-[11px] font-medium outline-none transition focus:border-[#4e89d8] focus-visible:ring-2 focus-visible:ring-[#4e89d8]/25"
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
          placeholder="목록 검색"
          className="tp-input-soft min-h-10 w-full min-w-0 bg-white px-2.5 text-[12px] outline-none transition focus:border-[#4e89d8] focus-visible:ring-2 focus-visible:ring-[#4e89d8]/25 sm:max-w-[260px]"
        />

        <button
          type="submit"
          className={feedFooterSearchPrimaryActionClassName}
        >
          검색
        </button>

        {query.trim().length > 0 ? (
          <Link
            href={resetHref}
            prefetch={false}
            className={`${feedFooterSearchResetActionClassName} col-span-3 justify-self-end`}
          >
            초기화
          </Link>
        ) : null}
      </form>
    </div>
  );
}
