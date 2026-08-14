import Link from "next/link";
import { PostScope, type PostType } from "@prisma/client";

import { FeedInfiniteList } from "@/components/posts/feed-infinite-list";
import { FeedPagination } from "@/components/posts/feed-pagination";
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
    excludeTypes: [...COMMON_BOARD_POST_TYPES] as PostType[],
  };
  const [result, total] = await Promise.all([listPosts(listOptions), countPosts(listOptions)]);
  const totalPages = Math.max(1, Math.ceil(total / 20));
  const title = item?.label ?? "전체 동물 게시판";
  const hrefForTab = (slug: string) => slug ? buildAnimalBoardHref(code, slug) : buildAnimalBoardHref(code);
  const searchSuffix = q ? `?q=${encodeURIComponent(q)}` : "";

  const feedItems = result.items.map((post) => {
    const row = post as typeof post & { petType?: { id: string; labelKo: string; category: { labelKo: string } } | null };
    return {
    ...post,
    createdAt: post.createdAt.toISOString(),
    petType: row.petType ? { ...row.petType, categoryLabelKo: row.petType.category.labelKo } : null,
    };
  }) as unknown as React.ComponentProps<typeof FeedInfiniteList>["initialItems"];
  return <main className="tp-page-bg min-h-screen"><div className="mx-auto w-full max-w-[1320px] px-4 py-5 sm:px-6 lg:px-10">
    <section className="tp-hero p-4 sm:p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#3f5f90]">동물 게시판</p><h1 className="mt-1 text-2xl font-bold text-[#10284a]">{title}</h1><p className="mt-1 text-xs text-[#4f678d]">동물별 게시판으로 이동해 같은 관심사의 글을 독립적으로 탐색하세요.</p></section>
    <nav className="mt-3 flex gap-1.5 overflow-x-auto border-b border-[#dbe6f6] pb-2" aria-label="동물 게시판 유형">{tabs.map((tab) => <Link key={tab.slug || "all"} href={`${hrefForTab(tab.slug)}${searchSuffix}`} aria-current={(tab.type ?? undefined) === postType || (!postType && !tab.type) ? "page" : undefined} className={`tp-filter-pill whitespace-nowrap px-3 py-2 text-xs ${(tab.type ?? undefined) === postType || (!postType && !tab.type) ? "tp-filter-pill-active" : ""}`}>{tab.label}</Link>)}</nav>
    <div className="mt-4"><FeedInfiniteList initialItems={feedItems} initialNextCursor={null} mode="ALL" query={{ scope: "GLOBAL", ...(community ? { petTypeId: community.id } : {}), ...(postType ? { type: postType } : {}), ...(q ? { q } : {}) }} queryKey={`animal:${code}:${boardType ?? "all"}:${q ?? ""}:${page}`} disableLoadMore preferGuestDetail /></div>
    <FeedPagination resolvedPage={page} totalPages={totalPages} makeHref={({ nextPage }) => `${hrefForTab(boardType ? tabs.find((tab) => tab.type === boardType)?.slug ?? "" : "")}${q ? `?q=${encodeURIComponent(q)}&page=${nextPage}` : `?page=${nextPage}`}`} />
  </div></main>;
}
