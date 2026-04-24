import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PostType } from "@prisma/client";

import { PostListContextBadges } from "@/components/posts/post-list-context-badges";
import { PostListItemShell } from "@/components/posts/post-list-item-shell";
import { PostSignalIcons } from "@/components/posts/post-signal-icons";
import { EmptyState } from "@/components/ui/empty-state";
import { auth } from "@/lib/auth";
import { formatRelativeDate, getPostSignals, postTypeMeta } from "@/lib/post-presenter";
import { PRIMARY_POST_TYPES, SECONDARY_POST_TYPES } from "@/lib/post-type-groups";
import { resolveUserDisplayName } from "@/lib/user-display";
import { postListSchema, toPostListInput } from "@/lib/validations/post";
import { redirectToProfileIfNicknameMissing } from "@/server/nickname-guard";
import { listUserBookmarkedPostsPage } from "@/server/queries/post.queries";

type BookmarksPageProps = {
  searchParams?: Promise<{
    type?: PostType;
    q?: string;
    page?: string;
  }>;
};

const BOOKMARKS_PAGE_SIZE = 20;

export const metadata: Metadata = {
  title: "북마크",
  description: "내가 북마크한 게시글을 다시 확인합니다.",
  alternates: {
    canonical: "/bookmarks",
  },
  robots: {
    index: false,
    follow: false,
  },
};

const typeLabels: Record<PostType, string> = {
  HOSPITAL_REVIEW: "병원후기",
  PLACE_REVIEW: "후기/리뷰",
  WALK_ROUTE: "동네 산책코스",
  MEETUP: "동네모임",
  MARKET_LISTING: "중고/공동구매",
  ADOPTION_LISTING: "유기동물 입양",
  SHELTER_VOLUNTEER: "보호소 봉사 모집",
  LOST_FOUND: "실종/목격 제보",
  QA_QUESTION: "질문/답변",
  QA_ANSWER: "질문/답변",
  FREE_POST: "자유게시판",
  FREE_BOARD: "자유게시판",
  DAILY_SHARE: "자유게시판",
  PRODUCT_REVIEW: "용품리뷰",
  PET_SHOWCASE: "반려동물 자랑",
};

export default async function BookmarksPage({ searchParams }: BookmarksPageProps) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }

  redirectToProfileIfNicknameMissing({
    isAuthenticated: true,
    nickname: session.user?.nickname,
  });

  const resolvedParams = (await searchParams) ?? {};
  const parsedParams = postListSchema.safeParse(resolvedParams);
  const listInput = parsedParams.success ? toPostListInput(parsedParams.data) : null;
  const type = listInput?.type;
  const requestedPage = Number.parseInt(
    typeof resolvedParams.page === "string" ? resolvedParams.page : "1",
    10,
  );
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const query = listInput?.q?.trim() ?? "";
  const hasActiveFilter = Boolean(type || query);

  const { items: posts, hasNext } = await listUserBookmarkedPostsPage({
    userId,
    type,
    q: query || undefined,
    limit: BOOKMARKS_PAGE_SIZE,
    page: currentPage,
  });

  const makeHref = ({
    nextType,
    nextQuery,
    nextPage,
  }: {
    nextType?: PostType | null;
    nextQuery?: string | null;
    nextPage?: number | null;
  }) => {
    const params = new URLSearchParams();
    const resolvedType = nextType === undefined ? type : nextType;
    const resolvedQuery = nextQuery === undefined ? query : nextQuery;
    const isTypeChanged = nextType !== undefined && nextType !== type;
    const isQueryChanged = nextQuery !== undefined && nextQuery !== query;
    const resolvedPage =
      nextPage === undefined ? (isTypeChanged || isQueryChanged ? 1 : currentPage) : nextPage;

    if (resolvedType) params.set("type", resolvedType);
    if (resolvedQuery) params.set("q", resolvedQuery);
    if (resolvedPage && resolvedPage > 1) {
      params.set("page", String(resolvedPage));
    }

    const serialized = params.toString();
    return serialized ? `/bookmarks?${serialized}` : "/bookmarks";
  };

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="tp-hero p-5 sm:p-6">
          <p className="tp-eyebrow">북마크</p>
          <h1 className="tp-text-page-title mt-2 text-[#10284a]">
            북마크한 게시글
          </h1>
          <p className="mt-2 text-sm text-[#4f678d]">
            게시글 상세에서 북마크한 글을 한곳에서 모아 확인할 수 있습니다.
          </p>
        </header>

        <section className="tp-card p-4 sm:p-5">
          <div className="space-y-3">
            <form action="/bookmarks" className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {type ? <input type="hidden" name="type" value={type} /> : null}
              <input
                name="q"
                defaultValue={query}
                placeholder="제목, 내용 검색"
                className="tp-input-soft h-9 w-full bg-white px-3.5 text-[13px] outline-none transition focus:border-[#4e89d8]"
              />
              <button
                type="submit"
                className="tp-btn-primary tp-btn-md min-w-[72px]"
              >
                검색
              </button>
              {query ? (
                <Link
                  href={makeHref({ nextQuery: null })}
                  className="tp-btn-soft tp-btn-md inline-flex min-w-[72px] items-center justify-center"
                >
                  초기화
                </Link>
              ) : null}
            </form>

            <div className="tp-soft-card p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
                주요 게시판
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={makeHref({ nextType: null })}
                  className={`tp-filter-pill ${
                    !type
                      ? "tp-filter-pill-active"
                      : ""
                  }`}
                >
                  전체
                </Link>
                {PRIMARY_POST_TYPES.map((value) => (
                  <Link
                    key={value}
                    href={makeHref({ nextType: value })}
                    className={`tp-filter-pill ${
                      type === value
                        ? "tp-filter-pill-active"
                        : ""
                    }`}
                  >
                    {typeLabels[value]}
                  </Link>
                ))}
              </div>
              <div className="mt-3 border-t border-[#dbe6f6] pt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4b6b9b]">
                  추가 게시판
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {SECONDARY_POST_TYPES.map((value) => (
                    <Link
                      key={value}
                      href={makeHref({ nextType: value })}
                      className={`tp-filter-pill ${
                        type === value
                          ? "tp-filter-pill-active"
                          : ""
                      }`}
                    >
                      {typeLabels[value]}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <p className="border-t border-[#dbe6f6] pt-3 text-xs text-[#4f678d]">
              페이지 {currentPage} · 현재 {posts.length}건 표시
            </p>
          </div>
        </section>

        <section className="tp-card overflow-hidden">
          {posts.length === 0 ? (
            hasActiveFilter ? (
              <EmptyState
                title="조건에 맞는 북마크가 없습니다"
                description="검색어 또는 게시판 필터를 줄이면 저장한 글을 다시 찾을 수 있습니다."
                actionHref="/bookmarks"
                actionLabel="전체 북마크 보기"
              />
            ) : (
              <EmptyState
                title="북마크한 글이 없습니다"
                description="게시글 상세에서 북마크 버튼을 눌러 나중에 다시 볼 글을 모아보세요."
                actionHref="/feed"
                actionLabel="피드로 이동"
              />
            )
          ) : (
            <div className="divide-y divide-[#e1e9f5]">
              {posts.map((post) => {
                const signals = getPostSignals({
                  title: post.title,
                  content: post.content,
                  imageCount: post.images.length,
                });
                const meta = postTypeMeta[post.type];

                return (
                  <PostListItemShell
                    key={post.id}
                    href={`/posts/${post.id}`}
                    articleClassName={`grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_196px] md:items-start ${
                      post.status === "HIDDEN" ? "bg-[#fff5f5]" : ""
                    }`}
                    topContent={
                      <PostListContextBadges
                        label={meta.label}
                        chipClass={meta.chipClass}
                        locationLabel={
                          post.neighborhood
                            ? `${post.neighborhood.city} ${post.neighborhood.name}`
                            : "전체"
                        }
                        status={post.status}
                      />
                    }
                    title={<span className="truncate">{post.title}</span>}
                    titleSuffix={
                      <>
                        <PostSignalIcons signals={signals} />
                        {post.commentCount > 0 ? (
                          <span className="shrink-0 text-[#2f5da4]">[{post.commentCount}]</span>
                        ) : null}
                      </>
                    }
                    excerpt={
                      post.content.length > 120 ? `${post.content.slice(0, 120)}...` : post.content
                    }
                    meta={
                      <>
                        <p className="font-semibold text-[#1f3f71]">
                          {resolveUserDisplayName(post.author.nickname)}
                        </p>
                        <p className="mt-0.5">북마크 {formatRelativeDate(post.bookmarkedAt)}</p>
                        <p className="mt-0.5 text-[11px] text-[#6a84ab]">
                          작성 {formatRelativeDate(post.createdAt)} · 조회 {post.viewCount.toLocaleString()} · 좋아요{" "}
                          {post.likeCount.toLocaleString()}
                        </p>
                      </>
                    }
                  />
                );
              })}
            </div>
          )}
        </section>

        {posts.length > 0 ? (
          <section className="flex items-center justify-center gap-2">
            {currentPage > 1 ? (
              <Link
                href={makeHref({ nextPage: currentPage - 1 })}
                className="tp-btn-soft tp-btn-sm text-[#315484]"
              >
                이전 페이지
              </Link>
            ) : null}
            <span className="text-xs text-[#4f678d]">{currentPage} 페이지</span>
            {hasNext ? (
              <Link
                href={makeHref({ nextPage: currentPage + 1 })}
                className="tp-btn-soft tp-btn-sm text-[#315484]"
              >
                다음 페이지
              </Link>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}
