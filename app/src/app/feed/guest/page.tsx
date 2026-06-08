import Link from "next/link";
import type { Metadata } from "next";
import type { PostType } from "@prisma/client";
import { redirect } from "next/navigation";

import { NeighborhoodGateNotice } from "@/components/neighborhood/neighborhood-gate-notice";
import { FeedControlPanel } from "@/components/posts/feed-control-panel";
import { FeedInlineSearchForm } from "@/components/posts/feed-inline-search-form";
import { FeedInfiniteList } from "@/components/posts/feed-infinite-list";
import { FeedPagination } from "@/components/posts/feed-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { shouldStripFeedPageParam } from "@/lib/feed";
import { resolveFeedEmptyStateCopy } from "@/lib/feed-empty-state-copy";
import { buildGuestFeedHref } from "@/lib/posts/guest-feed-href";
import type {
  FeedDensity,
  FeedMode,
  FeedSearchIn,
  GuestFeedPayload,
} from "@/lib/posts/guest-feed-types";
import { postTypeMeta } from "@/lib/post-presenter";
import type { ReviewCategory } from "@/lib/review-category";
import { buildGuestFeedPageServiceResult } from "@/server/services/posts/guest-feed-page.service";
import { createFeedPagePerformanceTracker } from "@/server/services/posts/feed-page-performance.service";

type GuestFeedPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const feedBasePath = "/feed/guest";
const feedInlinePrimaryActionClassName =
  "inline-flex min-h-10 items-center justify-center rounded-md bg-[#3567b5] px-3 text-xs font-semibold text-[#fbfdff] transition hover:bg-[#2f5da4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bfd3f0] focus-visible:ring-offset-1";

export const metadata: Metadata = {
  title: "공개 반려생활 피드",
  description: "비회원에게 공개된 병원 후기, 산책코스, 분실/목격 제보와 인기글을 확인하세요.",
  alternates: {
    canonical: "/feed/guest",
  },
  openGraph: {
    title: "TownPet 공개 반려생활 피드",
    description: "비회원에게 공개된 병원 후기, 산책코스, 분실/목격 제보와 인기글을 확인하세요.",
    url: "/feed/guest",
  },
};

export const dynamic = "force-dynamic";

function toURLSearchParams(params: Record<string, string | string[] | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item.length > 0) {
          searchParams.append(key, item);
        }
      }
      continue;
    }

    if (typeof value === "string" && value.length > 0) {
      searchParams.set(key, value);
    }
  }

  return searchParams;
}

function redirectWithSearchParams(searchParams: URLSearchParams) {
  const serialized = searchParams.toString();
  redirect(serialized ? `${feedBasePath}?${serialized}` : feedBasePath);
}

function redirectLegacyGuestFeedParams(searchParams: URLSearchParams) {
  const legacyCommunityId = searchParams.get("communityId")?.trim() ?? "";
  const hasLegacyScope = Boolean(searchParams.get("scope")?.trim());
  const hasPetType = searchParams.getAll("petType").some((value) => value.trim().length > 0);
  const hasCursor = Boolean(searchParams.get("cursor")?.trim());

  if (!hasLegacyScope && !(legacyCommunityId.length > 0 && !hasPetType) && !hasCursor) {
    return;
  }

  const nextParams = new URLSearchParams(searchParams);
  nextParams.delete("scope");
  nextParams.delete("cursor");
  if (legacyCommunityId.length > 0 && !hasPetType) {
    nextParams.set("petType", legacyCommunityId);
  }
  nextParams.delete("communityId");
  redirectWithSearchParams(nextParams);
}

function redirectTrivialPageParam(searchParams: URLSearchParams) {
  if (!shouldStripFeedPageParam({ page: searchParams.get("page") })) {
    return;
  }

  const nextParams = new URLSearchParams(searchParams);
  nextParams.delete("page");
  redirectWithSearchParams(nextParams);
}

function GuestFeedShell({ data }: { data: GuestFeedPayload }) {
  if (data.view === "gate") {
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

  const {
    mode,
    type,
    reviewBoard,
    reviewCategory,
    petTypeId,
    petTypeIds,
    query,
    selectedSearchIn,
    density,
    isGuestTypeBlocked,
    feedTitle,
    totalPages,
    resolvedPage,
    feedQueryKey,
    items,
  } = data.feed;
  const isUltraDense = density === "ULTRA";
  const loginHref = (nextPath: string) => `/login?next=${encodeURIComponent(nextPath)}`;
  const feedSearchIn =
    selectedSearchIn === "TITLE" || selectedSearchIn === "CONTENT"
      ? selectedSearchIn
      : "TITLE_CONTENT";
  const feedSearchResetHref = buildGuestFeedHref({
    basePath: feedBasePath,
    type,
    reviewBoard,
    reviewCategory,
    petTypeIds,
    query: "",
    mode,
    selectedSearchIn: "ALL",
    density,
    resolvedPage: 1,
  });

  const makeHref = ({
    nextType,
    nextPetTypeId,
    nextReviewCategory,
    nextQuery,
    nextPage,
    nextMode,
    nextSearchIn,
    nextDensity,
  }: {
    nextType?: PostType | null;
    nextPetTypeId?: string | null;
    nextReviewCategory?: ReviewCategory | null;
    nextQuery?: string | null;
    nextPage?: number | null;
    nextMode?: FeedMode | null;
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
      selectedSearchIn,
      density,
      resolvedPage,
      nextType,
      nextPetTypeId,
      nextReviewCategory,
      nextQuery,
      nextPage,
      nextMode,
      nextSearchIn,
      nextDensity,
    });
  const hasFeedSearchQuery = query.trim().length > 0;
  const emptyStateCopy = resolveFeedEmptyStateCopy({
    mode,
    isGuestTypeBlocked,
    hasQuery: hasFeedSearchQuery,
  });
  const emptyStateAllPostsHref = makeHref({ nextMode: "ALL", nextPage: 1 });
  const emptyStateActionHref = isGuestTypeBlocked
    ? loginHref(`/feed/guest${type ? `?type=${type}` : ""}`)
    : hasFeedSearchQuery
      ? feedSearchResetHref
      : mode === "BEST"
        ? emptyStateAllPostsHref
        : "/posts/new";
  const emptyStateSecondaryActionHref =
    !isGuestTypeBlocked && hasFeedSearchQuery && mode === "BEST"
      ? emptyStateAllPostsHref
      : undefined;

  return (
    <div className="tp-page-bg min-h-screen pb-16">
      <main
        className={`mx-auto flex w-full max-w-[1320px] flex-col px-4 sm:px-6 lg:px-10 ${
          isUltraDense ? "gap-1.5 py-2 sm:gap-2" : "gap-3 py-4 sm:gap-4 sm:py-5"
        }`}
      >
        <div className={isUltraDense ? "space-y-2" : "space-y-3"}>
          <header
            className={`animate-float-in border-y border-[#e1e9f5] bg-[#fbfdff] sm:rounded-xl sm:border ${
              isUltraDense ? "px-3 py-2 sm:px-4 sm:py-3" : "px-3 py-2.5 sm:px-5 sm:py-3"
            }`}
          >
            <div className="flex items-center justify-between gap-2 lg:items-center">
              <div className="min-w-0">
                <p className="hidden text-[10px] font-semibold leading-none text-[#5a7398] sm:block">공개 피드</p>
                <h1
                  className={
                    isUltraDense
                      ? "text-base font-semibold text-[#1e3f74] sm:mt-1 sm:text-xl"
                      : "text-lg font-semibold text-[#1e3f74] sm:mt-1 sm:text-2xl"
                  }
                >
                  {feedTitle}
                </h1>
                <p className="mt-1.5 hidden max-w-[640px] text-sm leading-6 text-[#4f678d] sm:block">
                  비회원에게 공개된 커뮤니티 글과 인기글을 확인할 수 있습니다.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/posts/new"
                  prefetch={false}
                  className={feedInlinePrimaryActionClassName}
                >
                  글쓰기
                </Link>
              </div>
            </div>
          </header>

          {isGuestTypeBlocked && type ? (
            <div className="border border-[#d9c38b] bg-[#fff8e5] px-3 py-2.5 text-sm text-[#6c5319]">
              선택한 게시판({postTypeMeta[type].label})은 로그인 후 볼 수 있습니다.{" "}
              <Link
                href={loginHref(`/feed/guest?type=${type}`)}
                prefetch={false}
                className="font-semibold text-[#2f5da4] hover:text-[#244b86]"
              >
                로그인하기
              </Link>
            </div>
          ) : null}

          <FeedControlPanel
            mode={mode}
            reviewBoard={reviewBoard}
            reviewCategory={reviewCategory}
            makeHref={makeHref}
            searchSlot={
              <FeedInlineSearchForm
                actionPath={feedBasePath}
                query={query}
                searchIn={feedSearchIn}
                resetHref={feedSearchResetHref}
                mode={mode}
                type={type}
                petTypeIds={petTypeIds}
                reviewCategory={reviewCategory}
              />
            }
          />

          <section id="feed-list" className="animate-fade-up overflow-hidden border-y border-[#d9e5f7] bg-white sm:rounded-xl sm:border">
            {items.length === 0 ? (
              <EmptyState
                eyebrow={emptyStateCopy.eyebrow}
                title={emptyStateCopy.title}
                description={emptyStateCopy.description}
                actionHref={emptyStateActionHref}
                actionLabel={emptyStateCopy.actionLabel}
                secondaryActionHref={emptyStateSecondaryActionHref}
                secondaryActionLabel={emptyStateCopy.secondaryActionLabel}
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
                  sort: "LATEST",
                  personalized: false,
                }}
                queryKey={feedQueryKey}
              />
            )}
            {items.length > 0 && totalPages > 1 ? (
              <FeedPagination
                resolvedPage={resolvedPage}
                totalPages={totalPages}
                makeHref={makeHref}
              />
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}

export default async function GuestFeedPage({ searchParams }: GuestFeedPageProps) {
  const resolvedParams = (await searchParams) ?? {};
  const requestSearchParams = toURLSearchParams(resolvedParams);

  redirectLegacyGuestFeedParams(requestSearchParams);
  redirectTrivialPageParam(requestSearchParams);

  const tracker = createFeedPagePerformanceTracker({
    forceLog: requestSearchParams.get("perf") === "1",
    slowThresholdMs: 300,
  });
  const result = await buildGuestFeedPageServiceResult({
    searchParams: requestSearchParams,
    tracker,
    route: "/feed/guest",
  });

  if (result.kind === "cursor") {
    redirect(feedBasePath);
  }

  return <GuestFeedShell data={result.data} />;
}
