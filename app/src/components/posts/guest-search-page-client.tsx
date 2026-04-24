"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PostType } from "@prisma/client";

import { HighlightText } from "@/components/content/highlight-text";
import { FeedSearchForm } from "@/components/posts/feed-search-form";
import { SearchResultTelemetry } from "@/components/posts/search-result-telemetry";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelativeDate, postTypeMeta } from "@/lib/post-presenter";
import { resolveUserDisplayName } from "@/lib/user-display";

type FeedSearchIn = "ALL" | "TITLE" | "CONTENT" | "AUTHOR";
type FeedScope = "LOCAL" | "GLOBAL";

type GuestSearchPostItem = {
  id: string;
  type: PostType;
  title: string;
  content: string;
  commentCount: number;
  createdAt: string;
  author: {
    id: string;
    nickname: string | null;
  };
};

type GuestSearchResponse =
  | {
      ok: true;
      data: {
        query: string;
        type: PostType | null;
        requestedScope: "LOCAL" | "GLOBAL";
        effectiveScope: "LOCAL" | "GLOBAL";
        isGuestScopeBlocked: boolean;
        searchIn: FeedSearchIn;
        isGuestTypeBlocked: boolean;
        popularTerms: string[];
        items: GuestSearchPostItem[];
      };
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
      };
    };

const DEFAULT_DATA = {
  query: "",
  type: null as PostType | null,
  requestedScope: "GLOBAL" as FeedScope,
  effectiveScope: "GLOBAL" as FeedScope,
  isGuestScopeBlocked: false,
  searchIn: "ALL" as FeedSearchIn,
  isGuestTypeBlocked: false,
  popularTerms: [] as string[],
  items: [] as GuestSearchPostItem[],
};

export function GuestSearchPageClient() {
  const searchParams = useSearchParams();
  const [data, setData] = useState(DEFAULT_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const queryString = searchParams.toString();

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setReloadToken((current) => current + 1);
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await fetch(
          `/api/search/guest${queryString ? `?${queryString}` : ""}`,
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const payload = (await response.json()) as GuestSearchResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok || !payload.ok) {
          throw new Error(payload.ok ? "검색 결과를 불러오지 못했습니다." : payload.error.message);
        }

        setData(payload.data);
      } catch (error) {
        if (cancelled || (error as { name?: string }).name === "AbortError") {
          return;
        }

        setLoadError(
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "검색 결과를 불러오지 못했습니다.",
        );
        setData((current) => ({
          ...current,
          items: [],
        }));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [queryString, reloadToken]);

  const query = data.query;
  const type = data.type;
  const effectiveScope = data.effectiveScope;
  const popularTerms = data.popularTerms;
  const selectedSearchIn = data.searchIn;
  const items = data.items;
  const isGuestTypeBlocked = data.isGuestTypeBlocked;
  const isGuestScopeBlocked = data.isGuestScopeBlocked;
  const hasQuery = query.trim().length > 0;

  const blockedLoginHref = useMemo(() => {
    if (!type) {
      return "/login?next=%2Fsearch";
    }
    return `/login?next=${encodeURIComponent(`/search?type=${type}`)}`;
  }, [type]);

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-6 lg:px-10">
        <header className="rounded-xl border border-[#d9e5f7] bg-[#f8fbff] p-4 sm:p-6">
          <p className="tp-eyebrow">검색</p>
          <h1 className="mt-2 text-xl font-semibold text-[#10284a] sm:text-3xl">
            게시글 검색
          </h1>
          <p className="mt-2 max-w-[680px] text-sm leading-6 text-[#4f678d]">
            제목, 내용, 작성자 기준으로 원하는 글을 빠르게 찾을 수 있습니다.
          </p>
          <div className="mt-4">
            <FeedSearchForm
              actionPath="/search/guest"
              query={query}
              searchIn={selectedSearchIn}
              personalized="0"
              type={type ?? undefined}
              mode="ALL"
              days={7}
              sort="LATEST"
              resetHref="/search"
              popularTerms={popularTerms}
            />
          </div>
        </header>

        {hasQuery ? (
          <SearchResultTelemetry
            query={query}
            resultCount={items.length}
            scope={effectiveScope}
            type={type}
            searchIn={selectedSearchIn}
          />
        ) : null}

        {isGuestScopeBlocked ? (
          <div className="border border-[#d9c38b] bg-[#fff8e5] px-4 py-3 text-sm text-[#6c5319]">
            동네 검색은 로그인 후 사용할 수 있습니다. 현재는{" "}
            <span className="font-semibold text-[#1f4f8f]">전체 검색</span> 결과를 보여주고
            있습니다.{" "}
            <Link
              href={`/login?next=${encodeURIComponent(`/search?scope=LOCAL${type ? `&type=${type}` : ""}`)}`}
              className="font-semibold text-[#2f5da4] underline underline-offset-2"
            >
              로그인하고 동네 검색하기
            </Link>
          </div>
        ) : null}

        {isGuestTypeBlocked && type ? (
          <div className="border border-[#d9c38b] bg-[#fff8e5] px-4 py-3 text-sm text-[#6c5319]">
            선택한 카테고리({postTypeMeta[type].label})는 로그인 후 검색할 수 있습니다.{" "}
            <Link
              href={blockedLoginHref}
              className="font-semibold text-[#2f5da4] underline underline-offset-2"
            >
              로그인하기
            </Link>
          </div>
        ) : null}

        {loadError ? (
          <section className="overflow-hidden rounded-xl border border-[#d9e5f7] bg-white">
            <EmptyState title="검색 결과를 불러오지 못했습니다" description={loadError} />
          </section>
        ) : isLoading && hasQuery ? (
          <section className="overflow-hidden rounded-xl border border-[#d9e5f7] bg-white">
            <EmptyState title="검색 중입니다" description="검색 결과를 불러오고 있습니다." />
          </section>
        ) : !hasQuery ? (
          <section className="overflow-hidden rounded-xl border border-[#d9e5f7] bg-white">
            <EmptyState
              title="검색어를 입력해 주세요"
              description="최소 2글자 이상 입력하면 자동완성과 최근/인기 검색어를 활용할 수 있습니다."
            />
          </section>
        ) : items.length === 0 ? (
          <section className="overflow-hidden rounded-xl border border-[#d9e5f7] bg-white">
            <EmptyState
              title="검색 결과가 없습니다"
              description="검색 범위를 바꾸거나 인기 검색어를 선택해 다시 시도해 보세요."
            />
          </section>
        ) : (
          <section className="tp-card overflow-hidden">
            <div className="border-b border-[#dbe6f6] px-4 py-3 text-sm text-[#4f678d] sm:px-5">
              검색어 <span className="font-semibold text-[#1f3f71]">&quot;{query}&quot;</span> ·{" "}
              결과 {items.length}건
            </div>
            <div className="divide-y divide-[#e4edf9]">
              {items.map((post) => (
                <article key={post.id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#59739b]">
                    <span className="font-semibold text-[#1f4f8f]">
                      {postTypeMeta[post.type].label}
                    </span>
                    <span>•</span>
                    <span>{formatRelativeDate(post.createdAt)}</span>
                    <span>•</span>
                    <span>{resolveUserDisplayName(post.author.nickname)}</span>
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
