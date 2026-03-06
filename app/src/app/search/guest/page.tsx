import Link from "next/link";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { PostScope, PostType } from "@prisma/client";

import { HighlightText } from "@/components/content/highlight-text";
import { FeedSearchForm } from "@/components/posts/feed-search-form";
import { EmptyState } from "@/components/ui/empty-state";
import { isLoginRequiredPostType } from "@/lib/post-access";
import { formatRelativeDate, postTypeMeta } from "@/lib/post-presenter";
import { postListSchema, toPostListInput } from "@/lib/validations/post";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { listRankedSearchPosts } from "@/server/queries/post.queries";
import { getPopularSearchTerms } from "@/server/queries/search.queries";

type FeedSearchIn = "ALL" | "TITLE" | "CONTENT" | "AUTHOR";

type SearchPageProps = {
  searchParams?: Promise<{
    q?: string;
    type?: PostType;
    scope?: "LOCAL" | "GLOBAL";
    searchIn?: string;
    limit?: string;
  }>;
};

export const metadata: Metadata = {
  title: "검색",
  description: "제목/내용/작성자 기준으로 게시글을 빠르게 찾으세요.",
  alternates: {
    canonical: "/search",
  },
  openGraph: {
    title: "TownPet 검색",
    description: "제목/내용/작성자 기준으로 게시글을 빠르게 찾으세요.",
    url: "/search",
  },
};

const getGuestSearchContext = unstable_cache(
  async () => {
    const [loginRequiredTypes, popularSearchTerms] = await Promise.all([
      getGuestReadLoginRequiredPostTypes(),
      getPopularSearchTerms(10),
    ]);

    return {
      loginRequiredTypes,
      popularSearchTerms,
    };
  },
  ["search-guest-context"],
  { revalidate: 60 },
);

function toFeedSearchIn(value?: string): FeedSearchIn {
  if (value === "TITLE" || value === "CONTENT" || value === "AUTHOR") {
    return value;
  }
  return "ALL";
}

export default async function GuestSearchPage({ searchParams }: SearchPageProps) {
  const { loginRequiredTypes, popularSearchTerms } = await getGuestSearchContext();
  const resolvedParams = (await searchParams) ?? {};
  const hasLegacyScope =
    typeof resolvedParams.scope === "string" && resolvedParams.scope.trim().length > 0;
  if (hasLegacyScope) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(resolvedParams)) {
      if (key === "scope") {
        continue;
      }
      if (typeof value === "string" && value.length > 0) {
        params.set(key, value);
      }
    }
    const serialized = params.toString();
    redirect(serialized ? `/search?${serialized}` : "/search");
  }
  const parsedParams = postListSchema.safeParse(resolvedParams);
  const listInput = parsedParams.success ? toPostListInput(parsedParams.data) : null;
  const type = listInput?.type;
  const effectiveScope = PostScope.GLOBAL;
  const query = listInput?.q?.trim() ?? "";
  const selectedSearchIn = toFeedSearchIn(resolvedParams.searchIn);
  const isGuestTypeBlocked = isLoginRequiredPostType(type, loginRequiredTypes);

  const resultItems =
    query.length > 0 && !isGuestTypeBlocked
      ? await listRankedSearchPosts({
          limit: 30,
          scope: effectiveScope,
          type,
          q: query,
          searchIn: selectedSearchIn,
          excludeTypes: loginRequiredTypes,
          neighborhoodId: undefined,
          viewerId: undefined,
        })
      : [];

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="tp-hero p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#3f5f90]">검색</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#10284a] sm:text-4xl">
            게시글 검색
          </h1>
          <p className="mt-2 text-sm text-[#4f678d] sm:text-base">
            제목, 내용, 작성자 기준으로 원하는 글을 빠르게 찾을 수 있습니다.
          </p>
          <div className="mt-4">
            <FeedSearchForm
              actionPath="/search"
              query={query}
              searchIn={selectedSearchIn}
              personalized="0"
              type={type}
              mode="ALL"
              days={7}
              sort="LATEST"
              resetHref="/search"
              popularTerms={popularSearchTerms}
            />
          </div>
        </header>

        {isGuestTypeBlocked && type ? (
          <div className="border border-[#d9c38b] bg-[#fff8e5] px-4 py-3 text-sm text-[#6c5319]">
            선택한 카테고리({postTypeMeta[type].label})는 로그인 후 검색할 수 있습니다.{" "}
            <Link
              href={`/login?next=${encodeURIComponent(`/search?type=${type}`)}`}
              className="font-semibold text-[#2f5da4] underline underline-offset-2"
            >
              로그인하기
            </Link>
          </div>
        ) : null}

        {query.length === 0 ? (
          <section className="tp-card overflow-hidden">
            <EmptyState
              title="검색어를 입력해 주세요"
              description="최소 2글자 이상 입력하면 자동완성과 최근/인기 검색어를 활용할 수 있습니다."
            />
          </section>
        ) : resultItems.length === 0 ? (
          <section className="tp-card overflow-hidden">
            <EmptyState
              title="검색 결과가 없습니다"
              description="검색 범위를 바꾸거나 인기 검색어를 선택해 다시 시도해 보세요."
            />
          </section>
        ) : (
          <section className="tp-card overflow-hidden">
            <div className="border-b border-[#dbe6f6] px-4 py-3 text-sm text-[#4f678d] sm:px-5">
              검색어 <span className="font-semibold text-[#1f3f71]">&quot;{query}&quot;</span> ·{" "}
              결과 {resultItems.length}건
            </div>
            <div className="divide-y divide-[#e4edf9]">
              {resultItems.map((post) => (
                <article key={post.id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#59739b]">
                    <span className="font-semibold text-[#1f4f8f]">
                      {postTypeMeta[post.type].label}
                    </span>
                    <span>•</span>
                    <span>{formatRelativeDate(post.createdAt.toISOString())}</span>
                    <span>•</span>
                    <span>{post.author.nickname ?? post.author.name ?? "익명"}</span>
                  </div>
                  <Link href={`/posts/${post.id}/guest`} className="mt-2 block">
                    <h2 className="text-base font-semibold text-[#12315c] sm:text-lg">
                      <HighlightText text={post.title} query={query} />
                    </h2>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#4f678d]">
                      <HighlightText text={post.content} query={query} />
                    </p>
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
