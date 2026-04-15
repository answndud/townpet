import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PostScope, PostType } from "@prisma/client";

import { HighlightText } from "@/components/content/highlight-text";
import { PostListContextBadges } from "@/components/posts/post-list-context-badges";
import { PostListItemShell } from "@/components/posts/post-list-item-shell";
import { FeedSearchForm } from "@/components/posts/feed-search-form";
import { SearchResultTelemetry } from "@/components/posts/search-result-telemetry";
import { EmptyState } from "@/components/ui/empty-state";
import { auth } from "@/lib/auth";
import { isLoginRequiredPostType } from "@/lib/post-access";
import { formatRelativeDate, postTypeMeta } from "@/lib/post-presenter";
import { resolvePublicGuestDisplayName, sanitizePublicGuestIdentity } from "@/lib/public-guest-identity";
import { resolveUserDisplayName } from "@/lib/user-display";
import { postListSchema, toPostListInput } from "@/lib/validations/post";
import { redirectToProfileIfNicknameMissing } from "@/server/nickname-guard";
import { isPrismaDatabaseUnavailableError } from "@/server/prisma-database-error";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import { listRankedSearchPosts } from "@/server/queries/post.queries";
import { getPopularSearchTerms } from "@/server/queries/search.queries";
import { getUserWithNeighborhoods } from "@/server/queries/user.queries";

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

function toFeedSearchIn(value?: string): FeedSearchIn {
  if (value === "TITLE" || value === "CONTENT" || value === "AUTHOR") {
    return value;
  }
  return "ALL";
}

function toFeedScope(value?: string): PostScope {
  return value === PostScope.LOCAL ? PostScope.LOCAL : PostScope.GLOBAL;
}

function buildSearchHref({
  q,
  type,
  searchIn,
  scope,
}: {
  q?: string;
  type?: PostType;
  searchIn?: FeedSearchIn;
  scope?: PostScope;
}) {
  const params = new URLSearchParams();
  if (q && q.trim().length > 0) {
    params.set("q", q.trim());
  }
  if (type) {
    params.set("type", type);
  }
  if (searchIn && searchIn !== "ALL") {
    params.set("searchIn", searchIn);
  }
  if (scope === PostScope.LOCAL) {
    params.set("scope", PostScope.LOCAL);
  }

  const serialized = params.toString();
  return serialized ? `/search?${serialized}` : "/search";
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedParams = (await searchParams) ?? {};
  const parsedParams = postListSchema.safeParse(resolvedParams);
  const listInput = parsedParams.success ? toPostListInput(parsedParams.data) : null;
  const type = listInput?.type;
  const query = listInput?.q?.trim() ?? "";
  const selectedSearchIn = toFeedSearchIn(resolvedParams.searchIn);
  const requestedScope = toFeedScope(resolvedParams.scope);
  const session = await auth();
  const userId = session?.user?.id;
  redirectToProfileIfNicknameMissing({
    isAuthenticated: Boolean(userId),
    nickname: session?.user?.nickname,
  });
  const user = userId
    ? await getUserWithNeighborhoods(userId).catch((error) => {
        if (isPrismaDatabaseUnavailableError(error)) {
          return null;
        }
        throw error;
      })
    : null;
  if (!user) {
    const guestParams = new URLSearchParams();
    if (query) {
      guestParams.set("q", query);
    }
    if (type) {
      guestParams.set("type", type);
    }
    if (selectedSearchIn !== "ALL") {
      guestParams.set("searchIn", selectedSearchIn);
    }
    if (requestedScope === PostScope.LOCAL) {
      guestParams.set("scope", PostScope.LOCAL);
    }
    const serialized = guestParams.toString();
    redirect(serialized ? `/search/guest?${serialized}` : "/search/guest");
  }
  const isAuthenticated = Boolean(user);
  const primaryNeighborhood = user?.neighborhoods.find((item) => item.isPrimary);
  const effectiveScope =
    requestedScope === PostScope.LOCAL && primaryNeighborhood ? PostScope.LOCAL : PostScope.GLOBAL;
  const [loginRequiredTypes, popularSearchTerms] = await Promise.all([
    getGuestReadLoginRequiredPostTypes(),
    getPopularSearchTerms(10, {
      scope: effectiveScope,
      type,
      searchIn: selectedSearchIn,
    }).catch((error) => {
      if (isPrismaDatabaseUnavailableError(error)) {
        return [];
      }
      throw error;
    }),
  ]);
  const blockedTypesForGuest = !isAuthenticated ? loginRequiredTypes : [];
  const isGuestTypeBlocked =
    !isAuthenticated && isLoginRequiredPostType(type, loginRequiredTypes);

  const neighborhoodId =
    effectiveScope === PostScope.LOCAL ? primaryNeighborhood?.neighborhood.id : undefined;

  const resultItems =
    query.length > 0 && !isGuestTypeBlocked
      ? await listRankedSearchPosts({
          limit: 30,
          scope: effectiveScope,
          type,
          q: query,
          searchIn: selectedSearchIn,
          excludeTypes: isAuthenticated ? undefined : blockedTypesForGuest,
          neighborhoodId,
          viewerId: user?.id,
        }).catch((error) => {
          if (isPrismaDatabaseUnavailableError(error)) {
            return [];
          }
          throw error;
        })
      : [];

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-10">
        <header className="tp-hero p-5 sm:p-6">
          <p className="tp-eyebrow">검색</p>
          <h1 className="tp-text-page-title mt-2 text-[#10284a]">
            게시글 검색
          </h1>
          <p className="mt-2 text-sm text-[#4f678d]">
            제목, 내용, 작성자 기준으로 원하는 글을 빠르게 찾을 수 있습니다.
          </p>
          <div className="mt-4">
            <FeedSearchForm
              actionPath="/search"
              query={query}
              searchIn={selectedSearchIn}
              scope={effectiveScope}
              personalized="0"
              type={type}
              mode="ALL"
              days={7}
              sort="LATEST"
              resetHref="/search"
              popularTerms={popularSearchTerms}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <Link
              href={buildSearchHref({
                q: query || undefined,
                type,
                searchIn: selectedSearchIn,
                scope: PostScope.GLOBAL,
              })}
              className={`tp-filter-pill ${
                effectiveScope === PostScope.GLOBAL
                  ? "tp-filter-pill-active"
                  : ""
              }`}
            >
              전체 검색
            </Link>
            {primaryNeighborhood ? (
              <Link
                href={buildSearchHref({
                  q: query || undefined,
                  type,
                  searchIn: selectedSearchIn,
                  scope: PostScope.LOCAL,
                })}
                className={`tp-filter-pill ${
                  effectiveScope === PostScope.LOCAL
                    ? "tp-filter-pill-active"
                    : ""
                }`}
              >
                {primaryNeighborhood.neighborhood.name} 검색
              </Link>
            ) : (
              <span className="tp-filter-pill border-[#e0e6f0] bg-[#f8fbff] text-[#6c7f9b]">
                대표 동네를 설정하면 동네 검색을 사용할 수 있습니다.
              </span>
            )}
          </div>
        </header>

        {query.length > 0 ? (
          <SearchResultTelemetry
            query={query}
            resultCount={resultItems.length}
            scope={effectiveScope}
            type={type}
            searchIn={selectedSearchIn}
          />
        ) : null}

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
              {resultItems.length}건
            </div>
            <div className="divide-y divide-[#e1e9f5]">
              {resultItems.map((post) => {
                const guestMeta = sanitizePublicGuestIdentity(post as {
                  guestDisplayName?: string | null;
                  guestAuthor?: {
                    displayName?: string | null;
                    ipDisplay?: string | null;
                    ipLabel?: string | null;
                  } | null;
                  guestIpDisplay?: string | null;
                  guestIpLabel?: string | null;
                });
                const meta = postTypeMeta[post.type];
                const excerpt =
                  post.content.length > 180
                    ? `${post.content.slice(0, 180)}...`
                    : post.content;
                const isGuestPost = Boolean(
                  (post as { guestAuthorId?: string | null }).guestAuthorId ||
                    guestMeta.guestDisplayName,
                );
                const authorNode = isGuestPost ? (
                  <span>{resolvePublicGuestDisplayName(guestMeta.guestDisplayName)}</span>
                ) : (
                  <Link href={`/users/${post.author.id}`} className="hover:text-[#2f5da4]">
                    {resolveUserDisplayName(post.author.nickname)}
                  </Link>
                );

                return (
                  <PostListItemShell
                    key={post.id}
                    href={isAuthenticated ? `/posts/${post.id}` : `/posts/${post.id}/guest`}
                    articleClassName="grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_168px] md:items-start"
                    topContent={
                      <PostListContextBadges
                        label={meta.label}
                        chipClass={meta.chipClass}
                        locationLabel={
                          post.neighborhood
                            ? `${post.neighborhood.city} ${post.neighborhood.name}`
                            : "전체"
                        }
                      />
                    }
                    title={
                      <span className="overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                        <HighlightText text={post.title} query={query} />
                      </span>
                    }
                    titleSuffix={
                      post.commentCount > 0 ? (
                        <span className="shrink-0 text-[#2f5da4]">[{post.commentCount}]</span>
                      ) : null
                    }
                    excerpt={<HighlightText text={excerpt} query={query} />}
                    excerptClassName="mt-1 line-clamp-3 text-[13px] leading-5 text-[#4c6488]"
                    meta={
                      <>
                        <p className="font-semibold text-[#1f3f71]">{authorNode}</p>
                        <p className="mt-0.5 text-[11px] text-[#6a84ab]">
                          {formatRelativeDate(post.createdAt)} · 댓글 {post.commentCount}
                        </p>
                      </>
                    }
                    metaClassName="text-xs text-[#5f79a0] md:text-right"
                  />
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
