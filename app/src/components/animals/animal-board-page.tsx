import Link from "next/link";
import { PostScope, type PostType } from "@prisma/client";

import { FeedInfiniteList } from "@/components/posts/feed-infinite-list";
import { FeedInlineSearchForm } from "@/components/posts/feed-inline-search-form";
import { FeedPagination } from "@/components/posts/feed-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { getAnimalBoardByCode, buildAnimalBoardHref, type AnimalBoardType } from "@/lib/animal-board-catalog";
import { COMMON_BOARD_POST_TYPES } from "@/lib/community-board";
import { listPosts, countPosts } from "@/server/queries/post.queries";
import { getCommunityForAnimalBoardCode } from "@/server/queries/community.queries";

const tabs: Array<{ slug: string; label: string; type?: PostType }> = [
  { slug: "", label: "전체" },
  { slug: "free", label: "자유", type: "FREE_BOARD" },
  { slug: "questions", label: "질문·답변", type: "QA_QUESTION" },
  { slug: "showcase", label: "반려동물 자랑", type: "PET_SHOWCASE" },
  { slug: "product-reviews", label: "용품 후기", type: "PRODUCT_REVIEW" },
];

export async function AnimalBoardPage({ code, boardType, searchParams }: { code: string; boardType?: AnimalBoardType; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {};
  const q = typeof params.q === "string" ? params.q : undefined;
  const searchIn: "TITLE_CONTENT" | "TITLE" | "CONTENT" = params.searchIn === "TITLE" || params.searchIn === "CONTENT" ? params.searchIn : "TITLE_CONTENT";
  const page = Math.max(1, Number(params.page) || 1);
  const item = code === "all" ? null : getAnimalBoardByCode(code);
  const community = item ? await getCommunityForAnimalBoardCode(code) : null;
  const postType = boardType as PostType | undefined;
  const listOptions = {
    limit: 20,
    page,
    scope: PostScope.GLOBAL,
    ...(community ? { petTypeId: community.id } : {}),
    ...(postType ? { type: postType } : {}),
    ...(q ? { q } : {}),
    ...(q ? { searchIn } : {}),
    excludeTypes: [...COMMON_BOARD_POST_TYPES] as PostType[],
  };
  const [result, total] = await Promise.all([listPosts(listOptions), countPosts(listOptions)]);
  const totalPages = Math.max(1, Math.ceil(total / 20));
  const title = item?.label ?? "전체 동물 게시판";
  const hrefForTab = (slug: string) => slug ? buildAnimalBoardHref(code, slug) : buildAnimalBoardHref(code);
  const currentBoardHref = hrefForTab(boardType ? tabs.find((tab) => tab.type === boardType)?.slug ?? "" : "");
  const searchSuffix = q ? `?q=${encodeURIComponent(q)}${searchIn !== "TITLE_CONTENT" ? `&searchIn=${searchIn}` : ""}` : "";
  const searchResetHref = currentBoardHref;
  const searchActionPath = currentBoardHref;

  const feedItems = result.items.map((post) => {
    const row = post as typeof post & { petType?: { id: string; labelKo: string; category: { labelKo: string } } | null };
    return {
    ...post,
    createdAt: post.createdAt.toISOString(),
    petType: row.petType ? { ...row.petType, categoryLabelKo: row.petType.category.labelKo } : null,
    };
  }) as unknown as React.ComponentProps<typeof FeedInfiniteList>["initialItems"];
  return <main className="tp-page-bg min-h-screen"><div className="mx-auto w-full max-w-[1320px] px-3 py-4 sm:px-4 sm:py-5 lg:px-6">
    <section className="tp-hero px-4 py-3 sm:px-5"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#667085]">동물 게시판</p><h1 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#101828] sm:text-2xl">{title}</h1></section>
    <nav className="mt-3 flex gap-1 overflow-x-auto border-b border-[#e4e7ec]" aria-label="동물 게시판 유형">{tabs.map((tab) => <Link key={tab.slug || "all"} href={`${hrefForTab(tab.slug)}${searchSuffix}`} aria-current={(tab.type ?? undefined) === postType || (!postType && !tab.type) ? "page" : undefined} className={`inline-flex min-h-10 shrink-0 items-center border-b-2 border-transparent px-3 text-xs font-semibold text-[#667085] transition-colors hover:text-[#4338ca] ${(tab.type ?? undefined) === postType || (!postType && !tab.type) ? "border-[#4f46e5] text-[#4338ca]" : ""}`}>{tab.label}</Link>)}</nav>
    <section id="feed-list" className="mt-3 overflow-hidden border border-[#e4e7ec] bg-white sm:rounded-lg">
      <header className="flex flex-col gap-2 border-b border-[#e4e7ec] bg-white px-4 py-2.5 sm:px-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#667085]">게시글</p>
          <h2 className="mt-0.5 truncate text-sm font-semibold text-[#101828]">{title} 게시글</h2>
        </div>
        <span className="shrink-0 rounded border border-[#e4e7ec] bg-white px-2 py-1 text-[11px] font-semibold text-[#667085]">
          {total.toLocaleString("ko-KR")}개
        </span>
        <div className="w-full md:ml-auto md:w-auto">
          <FeedInlineSearchForm actionPath={searchActionPath} query={q ?? ""} searchIn={searchIn} resetHref={searchResetHref} />
        </div>
      </header>
      {feedItems.length > 0 ? (
        <FeedInfiniteList initialItems={feedItems} initialNextCursor={null} mode="ALL" query={{ scope: "GLOBAL", ...(community ? { petTypeId: community.id } : {}), ...(postType ? { type: postType } : {}), ...(q ? { q, searchIn } : {}) }} queryKey={`animal:${code}:${boardType ?? "all"}:${q ?? ""}:${searchIn}:${page}`} disableLoadMore preferGuestDetail />
      ) : (
        <EmptyState
          eyebrow="게시글 없음"
          title="아직 공개된 글이 없습니다."
          description="이 게시판에 첫 글을 남겨 반려생활 정보를 나눠 보세요."
          actionHref="/posts/new"
          actionLabel="글쓰기"
        />
      )}
      {feedItems.length > 0 && totalPages > 1 ? (
        <FeedPagination resolvedPage={page} totalPages={totalPages} makeHref={({ nextPage }) => `${currentBoardHref}?${new URLSearchParams({ ...(q ? { q } : {}), ...(searchIn !== "TITLE_CONTENT" ? { searchIn } : {}), page: String(nextPage) }).toString()}`} />
      ) : null}
    </section>
  </div></main>;
}
