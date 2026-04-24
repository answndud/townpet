"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PostType } from "@prisma/client";

import { NeighborhoodGateNotice } from "@/components/neighborhood/neighborhood-gate-notice";
import { FeedControlPanel } from "@/components/posts/feed-control-panel";
import { FeedInfiniteList } from "@/components/posts/feed-infinite-list";
import { FeedLoadingSkeleton } from "@/components/posts/feed-loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { isCommonBoardPostType } from "@/lib/community-board";
import { buildPaginationWindow } from "@/lib/pagination";
import type {
  BestDay,
  FeedDensity,
  FeedMode,
  FeedPeriod,
  FeedSearchIn,
  FeedSort,
  GuestFeedGate,
  GuestFeedPayload,
  GuestFeedResponse,
  GuestFeedView,
} from "@/lib/posts/guest-feed-types";
import { isFreeBoardPostType } from "@/lib/post-type-groups";
import { postTypeMeta } from "@/lib/post-presenter";
import { type ReviewCategory } from "@/lib/review-category";

function buildGuestFeedHref({
  basePath,
  type,
  reviewBoard,
  reviewCategory,
  petTypeIds,
  query,
  mode,
  bestDays,
  periodDays,
  selectedSort,
  selectedSearchIn,
  density,
  resolvedPage,
  nextType,
  nextPetTypeId,
  nextReviewCategory,
  nextQuery,
  nextPage,
  nextMode,
  nextDays,
  nextPeriod,
  nextSort,
  nextSearchIn,
  nextDensity,
  nextPersonalized,
}: {
  basePath: string;
  type: PostType | null;
  reviewBoard: boolean;
  reviewCategory: ReviewCategory | null;
  petTypeIds: string[];
  query: string;
  mode: FeedMode;
  bestDays: BestDay;
  periodDays: FeedPeriod | null;
  selectedSort: FeedSort;
  selectedSearchIn: FeedSearchIn;
  density: FeedDensity;
  resolvedPage: number;
  nextType?: PostType | null;
  nextPetTypeId?: string | null;
  nextReviewCategory?: ReviewCategory | null;
  nextQuery?: string | null;
  nextPage?: number | null;
  nextMode?: FeedMode | null;
  nextDays?: BestDay | null;
  nextPeriod?: FeedPeriod | null;
  nextSort?: FeedSort | null;
  nextSearchIn?: FeedSearchIn | null;
  nextDensity?: FeedDensity | null;
  nextPersonalized?: "0" | "1" | null;
}) {
  void nextPersonalized;
  const params = new URLSearchParams();
  const resolvedType = nextType === undefined ? type : nextType;
  const resolvedPetTypeIds =
    nextPetTypeId === undefined
      ? petTypeIds
      : nextPetTypeId
        ? [nextPetTypeId]
        : [];
  const resolvedReviewCategory =
    nextReviewCategory === undefined ? reviewCategory : nextReviewCategory;
  const resolvedQuery = nextQuery === undefined ? query : nextQuery;
  const resolvedMode = nextMode === undefined ? mode : nextMode;
  const resolvedDays = nextDays === undefined ? bestDays : nextDays;
  const resolvedPeriod = nextPeriod === undefined ? periodDays : nextPeriod;
  const resolvedSort = nextSort == null ? selectedSort : nextSort;
  const resolvedSearchIn = nextSearchIn == null ? selectedSearchIn : nextSearchIn;
  const resolvedDensity = nextDensity == null ? density : nextDensity;
  const effectivePage = nextPage === undefined ? resolvedPage : nextPage;
  const shouldKeepReviewBoard =
    reviewBoard && resolvedType === null && !resolvedReviewCategory;
  const normalizedType = shouldKeepReviewBoard ? PostType.PRODUCT_REVIEW : resolvedType;

  if (normalizedType) {
    params.set("type", normalizedType);
  }
  const canUseCommunityFilter =
    !normalizedType ||
    (!isCommonBoardPostType(normalizedType) && !isFreeBoardPostType(normalizedType));
  if (canUseCommunityFilter) {
    for (const value of resolvedPetTypeIds) {
      params.append("petType", value);
    }
  }
  if (resolvedReviewCategory) {
    params.set("review", resolvedReviewCategory);
  }
  if (resolvedQuery) {
    params.set("q", resolvedQuery);
  }
  if (resolvedSearchIn !== "ALL") {
    params.set("searchIn", resolvedSearchIn);
  }
  if (resolvedDensity === "ULTRA") {
    params.set("density", "ULTRA");
  }
  if (resolvedMode === "BEST") {
    params.set("mode", "BEST");
    params.set("days", String(resolvedDays));
  } else if (resolvedSort !== "LATEST") {
    params.set("sort", resolvedSort);
    if (resolvedPeriod) {
      params.set("period", String(resolvedPeriod));
    }
  } else if (resolvedPeriod) {
    params.set("period", String(resolvedPeriod));
  }
  if (effectivePage && effectivePage > 1) {
    params.set("page", String(effectivePage));
  }
  const serialized = params.toString();
  return serialized ? `${basePath}?${serialized}` : basePath;
}

type GuestFeedPageClientProps = {
  initialData?: GuestFeedPayload | null;
  initialQueryString?: string;
};

export function GuestFeedPageClient({
  initialData = null,
  initialQueryString = "",
}: GuestFeedPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState<GuestFeedGate | GuestFeedView | null>(initialData);
  const [isLoading, setIsLoading] = useState(initialData === null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const queryString = searchParams.toString();
  const feedBasePath = pathname?.startsWith("/feed/guest") ? "/feed/guest" : "/feed";
  const legacyCommunityId = searchParams.get("communityId")?.trim() ?? "";
  const hasLegacyScope = Boolean(searchParams.get("scope")?.trim());
  const hasPetType = searchParams.getAll("petType").some((value) => value.trim().length > 0);
  const shouldNormalizeLegacy = hasLegacyScope || (legacyCommunityId.length > 0 && !hasPetType);

  useEffect(() => {
    if (!pathname?.startsWith("/feed") || !shouldNormalizeLegacy) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("scope");
    if (legacyCommunityId.length > 0 && !hasPetType) {
      params.set("petType", legacyCommunityId);
    }
    params.delete("communityId");
    const serialized = params.toString();
    router.replace(serialized ? `${feedBasePath}?${serialized}` : feedBasePath);
  }, [feedBasePath, hasPetType, legacyCommunityId, pathname, router, searchParams, shouldNormalizeLegacy]);

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
    if (shouldNormalizeLegacy) {
      return;
    }

    if (reloadToken === 0 && initialData && initialQueryString === queryString) {
      setData(initialData);
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await fetch(`/api/feed/guest${queryString ? `?${queryString}` : ""}`, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as GuestFeedResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok || !payload.ok) {
          throw new Error(payload.ok ? "피드를 불러오지 못했습니다." : payload.error.message);
        }

        setData(payload.data);
      } catch (error) {
        if (cancelled || (error as { name?: string }).name === "AbortError") {
          return;
        }
        setLoadError(
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "피드를 불러오지 못했습니다.",
        );
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
  }, [initialData, initialQueryString, queryString, reloadToken, shouldNormalizeLegacy]);

  useEffect(() => {
    if (data?.view !== "feed" || typeof window === "undefined") {
      return;
    }

    const canonicalHref = buildGuestFeedHref({
      basePath: feedBasePath,
      type: data.feed.type,
      reviewBoard: data.feed.reviewBoard,
      reviewCategory: data.feed.reviewCategory,
      petTypeIds: data.feed.petTypeIds,
      query: data.feed.query,
      mode: data.feed.mode,
      bestDays: data.feed.bestDays,
      periodDays: data.feed.periodDays,
      selectedSort: data.feed.selectedSort,
      selectedSearchIn: data.feed.selectedSearchIn,
      density: data.feed.density,
      resolvedPage: data.feed.resolvedPage,
    });
    const currentHref = `${window.location.pathname}${window.location.search}`;
    if (canonicalHref !== currentHref) {
      router.replace(canonicalHref);
    }
  }, [data, feedBasePath, queryString, router]);

  if (data?.view === "gate") {
    return (
      <NeighborhoodGateNotice
        title={data.gate.title}
        description={data.gate.description}
        primaryLink={data.gate.primaryLink}
        primaryLabel={data.gate.primaryLabel}
        secondaryLink={data.gate.secondaryLink}
        secondaryLabel={data.gate.secondaryLabel}
      />
    );
  }

  if (isLoading || shouldNormalizeLegacy || !data) {
    return <FeedLoadingSkeleton />;
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fdfefe_55%,#fbfdff_100%)] pb-16">
        <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <section className="tp-card overflow-hidden">
            <EmptyState title="피드를 불러오지 못했습니다" description={loadError} />
          </section>
        </main>
      </div>
    );
  }

  const {
    mode,
    type,
    reviewBoard,
    reviewCategory,
    petTypeId,
    petTypeIds,
    query,
    selectedSort,
    selectedSearchIn,
    density,
    bestDays,
    periodDays,
    isGuestTypeBlocked,
    feedTitle,
    totalPages,
    resolvedPage,
    feedQueryKey,
    items,
  } = data.feed;
  const isUltraDense = density === "ULTRA";
  const loginHref = (nextPath: string) => `/login?next=${encodeURIComponent(nextPath)}`;

  const makeHref = ({
    nextType,
    nextPetTypeId,
    nextReviewCategory,
    nextQuery,
    nextPage,
    nextMode,
    nextDays,
    nextPeriod,
    nextSort,
    nextSearchIn,
    nextDensity,
  }: {
    nextType?: PostType | null;
    nextPetTypeId?: string | null;
    nextReviewCategory?: ReviewCategory | null;
    nextQuery?: string | null;
    nextPage?: number | null;
    nextMode?: FeedMode | null;
    nextDays?: BestDay | null;
    nextPeriod?: FeedPeriod | null;
    nextSort?: FeedSort | null;
    nextSearchIn?: FeedSearchIn | null;
    nextDensity?: FeedDensity | null;
    nextPersonalized?: "0" | "1" | null;
  }) =>
    buildGuestFeedHref({
      basePath: feedBasePath,
      type,
      reviewBoard,
      reviewCategory,
      petTypeIds,
      query,
      mode,
      bestDays,
      periodDays,
      selectedSort,
      selectedSearchIn,
      density,
      resolvedPage,
      nextType,
      nextPetTypeId,
      nextReviewCategory,
      nextQuery,
      nextPage,
      nextMode,
      nextDays,
      nextPeriod,
      nextSort,
      nextSearchIn,
      nextDensity,
    });

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <main
        className={`mx-auto flex w-full max-w-[1320px] flex-col px-4 sm:px-6 lg:px-10 ${
          isUltraDense ? "gap-1.5 py-2 sm:gap-2" : "gap-3 py-4 sm:gap-4 sm:py-5"
        }`}
      >
        <div className={isUltraDense ? "space-y-2" : "space-y-3"}>
          <header
            className={`tp-hero hidden animate-float-in sm:block ${
              isUltraDense ? "sm:px-3 sm:py-2" : "sm:px-4 sm:py-2.5"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1
                  className={
                    isUltraDense
                      ? "mt-0.5 text-[15px] font-semibold text-[#1e3f74] sm:text-base"
                      : "mt-0.5 text-lg font-semibold text-[#1e3f74] sm:text-[22px]"
                  }
                >
                  {feedTitle}
                </h1>
              </div>
            </div>
          </header>

          <a
            href="#feed-list"
            className="tp-btn-soft hidden w-fit items-center px-3 py-1.5 text-xs font-semibold sm:inline-flex lg:hidden"
          >
            목록 바로가기
          </a>

          {isGuestTypeBlocked && type ? (
            <div className="border border-[#d9c38b] bg-[#fff8e5] px-3 py-2.5 text-sm text-[#6c5319]">
              선택한 카테고리({postTypeMeta[type].label})는 로그인 후 열람할 수 있습니다.{" "}
              <Link
                href={loginHref(`/feed?type=${type}`)}
                className="font-semibold text-[#2f5da4] hover:text-[#244b86]"
              >
                로그인하기
              </Link>
            </div>
          ) : null}

          <FeedControlPanel
            mode={mode}
            selectedSort={selectedSort}
            bestDays={bestDays}
            periodDays={periodDays}
            reviewBoard={reviewBoard}
            reviewCategory={reviewCategory}
            makeHref={makeHref}
          />

          <section id="feed-list" className="animate-fade-up overflow-hidden rounded-xl border border-[#d9e5f7] bg-white">
            {items.length === 0 ? (
              <EmptyState
                title={mode === "BEST" ? "베스트글이 없습니다" : "게시글이 없습니다"}
                description={
                  isGuestTypeBlocked
                    ? "해당 카테고리는 로그인 후 확인할 수 있습니다."
                    : mode === "BEST"
                      ? "선택한 카테고리/범위에서 좋아요가 1개 이상인 글이 아직 없습니다."
                      : "글을 작성하거나 다른 카테고리를 확인해 주세요."
                }
                actionHref={
                  isGuestTypeBlocked
                    ? loginHref(`/feed${type ? `?type=${type}` : ""}`)
                    : mode === "BEST"
                      ? `${feedBasePath}?mode=ALL`
                      : "/posts/new"
                }
                actionLabel={
                  isGuestTypeBlocked
                    ? "로그인하고 보기"
                    : mode === "BEST"
                      ? "전체글 보기"
                      : "첫 글 작성하기"
                }
              />
            ) : (
              <FeedInfiniteList
                key={feedQueryKey}
                initialItems={items}
                initialNextCursor={null}
                mode={mode}
                apiPath="/api/feed/guest"
                preferGuestDetail
                query={{
                  type: type ?? undefined,
                  scope: "GLOBAL",
                  petTypeId: petTypeId ?? undefined,
                  petTypeIds,
                  reviewCategory: reviewCategory ?? undefined,
                  q: query || undefined,
                  searchIn: selectedSearchIn,
                  sort: selectedSort,
                  days: periodDays ?? undefined,
                  personalized: false,
                }}
                queryKey={feedQueryKey}
              />
            )}
            {items.length > 0 && totalPages > 1 ? (
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
            ) : null}
          </section>

          <div className="flex justify-end gap-2">
            <Link
              href="/posts/new"
              className="tp-btn-primary inline-flex h-9 items-center justify-center px-4 text-xs font-semibold hover:bg-[#274f8c]"
            >
              글쓰기
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
