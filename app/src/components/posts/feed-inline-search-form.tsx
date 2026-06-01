import Link from "next/link";
import type { PostType } from "@prisma/client";

import type { ReviewCategory } from "@/lib/review-category";

type FeedInlineSearchIn = "TITLE_CONTENT" | "TITLE" | "CONTENT";
type FeedInlineSearchMode = "ALL" | "BEST";

type FeedInlineSearchFormProps = {
  actionPath: string;
  query: string;
  searchIn: FeedInlineSearchIn;
  resetHref: string;
  mode?: FeedInlineSearchMode;
  type?: PostType | null;
  petTypeIds?: string[];
  reviewCategory?: ReviewCategory | null;
};

const feedInlineSearchPrimaryActionClassName =
  "inline-flex h-9 min-w-[50px] items-center justify-center rounded-[6px] bg-[#3567b5] px-3 text-[11px] font-semibold leading-none text-[#fbfdff] transition hover:bg-[#2f5da4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1";
const feedInlineSearchResetActionClassName =
  "tp-text-muted inline-flex h-9 min-w-[46px] items-center justify-center px-1.5 text-[11px] font-semibold leading-none transition hover:text-[#2f5da4] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1";

export function FeedInlineSearchForm({
  actionPath,
  query,
  searchIn,
  resetHref,
  mode = "ALL",
  type,
  petTypeIds = [],
  reviewCategory,
}: FeedInlineSearchFormProps) {
  return (
    <form
      action={actionPath}
      method="get"
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-1 sm:w-auto sm:flex sm:items-center sm:justify-end"
      aria-label="피드 게시글 검색"
    >
      {type ? <input type="hidden" name="type" value={type} /> : null}
      {reviewCategory ? <input type="hidden" name="review" value={reviewCategory} /> : null}
      {mode === "BEST" ? <input type="hidden" name="mode" value="BEST" /> : null}
      {petTypeIds.map((petTypeId) => (
        <input key={petTypeId} type="hidden" name="petType" value={petTypeId} />
      ))}

      <div className="flex h-9 min-w-0 items-center rounded-[7px] border border-[#cfddef] bg-white transition focus-within:border-[#8fb5e8] focus-within:ring-2 focus-within:ring-[#4e89d8]/15 sm:w-[360px]">
        <label className="sr-only" htmlFor="feed-inline-search-in">
          검색 위치
        </label>
        <select
          id="feed-inline-search-in"
          name="searchIn"
          defaultValue={searchIn}
          className="h-full shrink-0 rounded-l-[7px] bg-transparent px-3 text-[12px] font-semibold text-[#274f82] outline-none"
        >
          <option value="TITLE_CONTENT">제목+내용</option>
          <option value="TITLE">제목</option>
          <option value="CONTENT">내용</option>
        </select>

        <div className="h-4 w-px bg-[#dce7f5]" aria-hidden="true" />

        <label className="sr-only" htmlFor="feed-inline-query">
          검색어
        </label>
        <input
          id="feed-inline-query"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="검색어 입력"
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-[12px] text-[#1f3f71] outline-none placeholder:text-[#8ba0bd]"
        />
      </div>

      <button
        type="submit"
        className={feedInlineSearchPrimaryActionClassName}
      >
        검색
      </button>

      {query.trim().length > 0 ? (
        <Link
          href={resetHref}
          prefetch={false}
          className={`${feedInlineSearchResetActionClassName} col-span-2 justify-self-end`}
        >
          초기화
        </Link>
      ) : null}
    </form>
  );
}
