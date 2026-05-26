import Link from "next/link";
import type { Metadata } from "next";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PostScope, PostType } from "@prisma/client";

import { NeighborhoodGateNotice } from "@/components/neighborhood/neighborhood-gate-notice";
import { FeedControlPanel } from "@/components/posts/feed-control-panel";
import { FeedFooterSearchForm } from "@/components/posts/feed-footer-search-form";
import { FeedInfiniteList } from "@/components/posts/feed-infinite-list";
import { EmptyState } from "@/components/ui/empty-state";
import { auth } from "@/lib/auth";
import {
  buildFeedAdConfig,
  buildFeedPersonalizationSummary,
  resolveFeedAudienceContext,
} from "@/lib/feed-personalization";
import { toFeedAudienceSourceValue } from "@/lib/feed-personalization-metrics";
import { FEED_PAGE_SIZE, shouldStripFeedPageParam } from "@/lib/feed";
import {
  getDedicatedBoardPathByPostType,
  isCommonBoardPostType,
} from "@/lib/community-board";
import { isLoginRequiredPostType } from "@/lib/post-access";
import {
  PET_TYPE_PREFERENCE_COOKIE,
  parsePetTypePreferenceCookie,
} from "@/lib/pet-type-preference-cookie";
import { normalizeFeedPetTypeIds } from "@/lib/feed-pet-type-filter";
import { isFreeBoardPostType } from "@/lib/post-type-groups";
import { postTypeMeta } from "@/lib/post-presenter";
import { REVIEW_CATEGORY, type ReviewCategory } from "@/lib/review-category";
import { isLocalRequiredPostType } from "@/lib/post-scope-policy";
import { postListSchema, toPostListInput } from "@/lib/validations/post";
import { redirectToProfileIfNicknameMissing } from "@/server/nickname-guard";
import { listAudienceSegmentsByUserId } from "@/server/queries/audience-segment.queries";
import { listCommunityNavItems } from "@/server/queries/community.queries";
import {
  countPosts,
  countBestPosts,
  listViewerRecentEngagementSummaryLabels,
  listViewerRecentBehaviorSummaryLabels,
  listViewerRecentBookmarkSummaryLabels,
  listViewerRecentDwellSummaryLabels,
  listBestPosts,
  listPosts,
} from "@/server/queries/post.queries";
import {
  getUserWithNeighborhoods,
  listPetsByUserId,
} from "@/server/queries/user.queries";
import { isPrismaDatabaseUnavailableError } from "@/server/prisma-database-error";
import { createFeedPagePerformanceTracker } from "@/server/services/posts/feed-page-performance.service";
import { resolveFeedPageSlice } from "@/server/services/posts/feed-page-query.service";
import {
  filterRenderableUploadImages,
  resolveRenderableUploadPathnames,
} from "@/server/upload-asset.service";
import { buildInitialFeedItems } from "./feed-page-items";
import { FeedPagination } from "./feed-pagination";
import {
  type BestDay,
  type FeedDensity,
  type FeedMode,
  type FeedPeriod,
  type FeedPersonalized,
  type FeedSearchIn,
  type FeedSort,
  type HomePageProps,
  extractPreferredPetTypeIds,
  getGuestFeedContext,
  isMissingAudienceSegmentQueryError,
  maybeDebugDelay,
  toBestDay,
  toFeedDensity,
  toFeedMode,
  toFeedPeriod,
  toFeedPersonalized,
  toFeedSearchIn,
  toFeedSort,
} from "./feed-page-support";

type FeedListResult = Awaited<ReturnType<typeof listPosts>>;
type FeedListItem = FeedListResult["items"][number];
type BestFeedItems = Awaited<ReturnType<typeof listBestPosts>>;
type BestFeedItem = BestFeedItems[number];

export const metadata: Metadata = {
  title: "동네 반려생활 피드",
  description: "병원 후기, 산책코스, 분실/목격 제보와 질문 글을 최신순과 반응순으로 확인하세요.",
  alternates: {
    canonical: "/feed",
  },
  openGraph: {
    title: "TownPet 동네 반려생활 피드",
    description: "병원 후기, 산책코스, 분실/목격 제보와 질문 글을 최신순과 반응순으로 확인하세요.",
    url: "/feed",
  },
};

export default async function Home({ searchParams }: HomePageProps) {
  const resolvedParams = (await searchParams) ?? {};
  const perfRequested = resolvedParams.perf === "1";
  const feedPerf = createFeedPagePerformanceTracker({
    forceLog: perfRequested,
  });

  const [session, communities, cookieStore] = await feedPerf.measure(
    "bootstrap.session_and_communities",
    () =>
      Promise.all([
        auth(),
        listCommunityNavItems(50).catch(() => []),
        cookies(),
      ]),
  );
  const userId = session?.user?.id;
  redirectToProfileIfNicknameMissing({
    isAuthenticated: Boolean(userId),
    nickname: session?.user?.nickname,
  });
  const allPetTypeIds = communities.map((item) => item.id);
  const communityById = new Map(communities.map((item) => [item.id, item]));
  const cookiePetTypeIds = parsePetTypePreferenceCookie(
    cookieStore.get(PET_TYPE_PREFERENCE_COOKIE)?.value,
  ).filter((id) => allPetTypeIds.includes(id));
  const [user, loginRequiredTypes] = await feedPerf.measure("bootstrap.viewer_context", async () => {
    const resolvedUser = userId
      ? await getUserWithNeighborhoods(userId).catch((error) => {
          if (isPrismaDatabaseUnavailableError(error)) {
            return null;
          }
          throw error;
        })
      : null;
    const resolvedLoginRequiredTypes = resolvedUser
      ? []
      : await getGuestFeedContext().then((context) => context.loginRequiredTypes);

    return [resolvedUser, resolvedLoginRequiredTypes] as const;
  });
  const preferredPetTypeIds = extractPreferredPetTypeIds(user);
  const preferredPetTypeLabels = preferredPetTypeIds
    .map((id) => communityById.get(id)?.labelKo ?? null)
    .filter((label): label is string => typeof label === "string" && label.length > 0);
  const preferredInterestLabels = Array.from(
    new Set(
      preferredPetTypeIds.flatMap((id) =>
        Array.isArray(communityById.get(id)?.tags)
          ? (communityById.get(id)?.tags ?? [])
          : [],
      ),
    ),
  )
    .filter((label): label is string => typeof label === "string" && label.length > 0)
    .slice(0, 3);
  const isAuthenticated = Boolean(user);
  const blockedTypesForGuest = !isAuthenticated ? loginRequiredTypes : [];

  const legacyCommunityId =
    typeof resolvedParams.communityId === "string" ? resolvedParams.communityId.trim() : "";
  const hasLegacyCommunityId = legacyCommunityId.length > 0;
  const requestedPetTypeValues = Array.isArray(resolvedParams.petType)
    ? resolvedParams.petType
    : typeof resolvedParams.petType === "string"
      ? [resolvedParams.petType]
      : [];
  const normalizedPetTypeValues = requestedPetTypeValues
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const hasPetType =
    normalizedPetTypeValues.length > 0;
  const hasLegacyScope =
    typeof resolvedParams.scope === "string" && resolvedParams.scope.trim().length > 0;
  if ((hasLegacyCommunityId && !hasPetType) || hasLegacyScope) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(resolvedParams)) {
      if (key === "communityId" || key === "scope") {
        continue;
      }
      if (typeof value === "string" && value.length > 0) {
        params.set(key, value);
      }
    }
    if (hasLegacyCommunityId && !hasPetType) {
      params.set("petType", legacyCommunityId);
    }
    const serialized = params.toString();
    redirect(serialized ? `/feed?${serialized}` : "/feed");
  }
  if (
    shouldStripFeedPageParam({
      page: typeof resolvedParams.page === "string" ? resolvedParams.page : null,
    })
  ) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(resolvedParams)) {
      if (key === "page") {
        continue;
      }

      if (typeof value === "string" && value.length > 0) {
        params.set(key, value);
      }
    }

    const serialized = params.toString();
    redirect(serialized ? `/feed?${serialized}` : "/feed");
  }
  await maybeDebugDelay(resolvedParams.debugDelayMs);
  const parsedParams = postListSchema.safeParse({
    ...resolvedParams,
    petType: normalizedPetTypeValues[0],
    limit: FEED_PAGE_SIZE,
  });
  const listInput = parsedParams.success ? toPostListInput(parsedParams.data) : null;
  const requestedType = listInput?.type;
  const dedicatedBoardPath = getDedicatedBoardPathByPostType(requestedType);
  if (dedicatedBoardPath) {
    const params = new URLSearchParams();
    const requestedQuery =
      typeof resolvedParams.q === "string" ? resolvedParams.q.trim() : "";
    const requestedPage =
      typeof resolvedParams.page === "string" ? resolvedParams.page.trim() : "";
    if (requestedQuery.length > 0) {
      params.set("q", requestedQuery);
    }
    if (requestedPage.length > 0 && requestedPage !== "1") {
      params.set("page", requestedPage);
    }
    const serialized = params.toString();
    redirect(serialized ? `${dedicatedBoardPath}?${serialized}` : dedicatedBoardPath);
  }
  const requestedReviewCategory = listInput?.reviewCategory;
  const isLegacyReviewType =
    requestedType === PostType.PLACE_REVIEW || requestedType === PostType.PRODUCT_REVIEW;
  const type = isLegacyReviewType ? undefined : requestedType;
  const reviewCategory =
    requestedReviewCategory ??
    (requestedType === PostType.PLACE_REVIEW ? REVIEW_CATEGORY.PLACE : undefined);
  const reviewBoard = isLegacyReviewType || Boolean(reviewCategory);
  const requestedPetTypeId = listInput?.petTypeId;
  const requestedPetTypeIds = normalizeFeedPetTypeIds(
    normalizedPetTypeValues.length > 0
      ? normalizedPetTypeValues
      : requestedPetTypeId
        ? [requestedPetTypeId]
        : [],
    allPetTypeIds,
  );
  const uniqueRequestedPetTypeIds = Array.from(new Set(normalizedPetTypeValues));
  const shouldCanonicalizePetTypeQuery =
    normalizedPetTypeValues.length > 0 &&
    (uniqueRequestedPetTypeIds.length !== requestedPetTypeIds.length ||
      uniqueRequestedPetTypeIds.some((value, index) => requestedPetTypeIds[index] !== value));
  if (shouldCanonicalizePetTypeQuery) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(resolvedParams)) {
      if (key === "petType") {
        continue;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item.length > 0) {
            params.append(key, item);
          }
        }
        continue;
      }
      if (typeof value === "string" && value.length > 0) {
        params.set(key, value);
      }
    }
    for (const petTypeId of requestedPetTypeIds) {
      params.append("petType", petTypeId);
    }
    const serialized = params.toString();
    redirect(serialized ? `/feed?${serialized}` : "/feed");
  }
  const defaultPetTypeIds = isAuthenticated
    ? normalizeFeedPetTypeIds(preferredPetTypeIds, allPetTypeIds)
    : normalizeFeedPetTypeIds(cookiePetTypeIds, allPetTypeIds);
  const isCommonBoardType = type ? isCommonBoardPostType(type) : false;
  const isFreeBoardType = type ? isFreeBoardPostType(type) : false;
  const isLocalRequiredType = isLocalRequiredPostType(type);
  const petTypeIds = isCommonBoardType || isFreeBoardType
    ? []
    : requestedPetTypeIds.length > 0
      ? requestedPetTypeIds
      : defaultPetTypeIds;
  const petTypeId = petTypeIds[0];
  const selectedScope = isLocalRequiredType ? PostScope.LOCAL : PostScope.GLOBAL;
  const effectiveScope = isAuthenticated
    ? selectedScope
    : isLocalRequiredType
      ? PostScope.LOCAL
      : PostScope.GLOBAL;
  const mode = toFeedMode(resolvedParams.mode);
  const bestDays = toBestDay(resolvedParams.days);
  const periodDays = toFeedPeriod(resolvedParams.period);
  const selectedSort = toFeedSort(resolvedParams.sort);
  const selectedSearchIn = toFeedSearchIn(resolvedParams.searchIn);
  const selectedPersonalized = toFeedPersonalized(resolvedParams.personalized);
  const density = toFeedDensity(resolvedParams.density);
  const isUltraDense = density === "ULTRA";
  const usePersonalizedFeed =
    isAuthenticated && mode === "ALL" && selectedPersonalized === "1";
  const isGuestTypeBlocked =
    !isAuthenticated && isLoginRequiredPostType(requestedType, loginRequiredTypes);

  const primaryNeighborhood = user?.neighborhoods.find((item) => item.isPrimary);
  if (isAuthenticated && !primaryNeighborhood && effectiveScope !== PostScope.GLOBAL) {
    feedPerf.flush({
      route: "/feed",
      mode,
      page: 1,
      isAuthenticated,
      isGuestTypeBlocked: false,
      feedScope: effectiveScope,
      personalized: false,
      requestedType: type ?? null,
      reviewBoard,
    });

    if (isLocalRequiredType && type) {
      return (
        <NeighborhoodGateNotice
          title="내 동네 설정이 필요합니다."
          description={`${postTypeMeta[type].label}은 동네 설정 후 볼 수 있습니다. 프로필에서 대표 동네를 먼저 설정해 주세요.`}
          primaryLink="/profile"
          primaryLabel="프로필에서 동네 설정"
        />
      );
    }

    return (
      <NeighborhoodGateNotice
        title="동네 설정이 필요합니다."
        description="동네를 설정해야 로컬 피드를 확인할 수 있습니다."
        primaryLink="/profile"
        primaryLabel="프로필에서 동네 설정"
        secondaryLink="/feed"
        secondaryLabel="피드 보기"
      />
    );
  }

  const limit = FEED_PAGE_SIZE;
  const query = listInput?.q?.trim() ?? "";
  const requestedPage = Number.parseInt(resolvedParams.page ?? "1", 10);
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const neighborhoodId =
    effectiveScope === PostScope.LOCAL
      ? primaryNeighborhood?.neighborhood.id
      : undefined;

  let totalPages = 1;
  let resolvedPage = currentPage;
  let posts: FeedListResult = { items: [], nextCursor: null };
  let bestItems: BestFeedItems = [];

  if (!isGuestTypeBlocked) {
    if (mode === "BEST") {
      const bestPage = await feedPerf.measure("page_query.best", () =>
        resolveFeedPageSlice<BestFeedItem>({
          currentPage,
          limit,
          countItems: () =>
            countBestPosts({
              days: bestDays,
              type,
              reviewBoard,
              reviewCategory,
              scope: effectiveScope,
              petTypeId,
              petTypeIds,
              q: query || undefined,
              searchIn: selectedSearchIn,
              excludeTypes: isAuthenticated ? undefined : blockedTypesForGuest,
              neighborhoodId,
              minLikes: 1,
              viewerId: user?.id,
            }).catch((error) => {
              if (isPrismaDatabaseUnavailableError(error)) {
                return 0;
              }
              throw error;
            }),
          listPage: async (page) => {
            const items: BestFeedItems = await listBestPosts({
              limit,
              page,
              days: bestDays,
              type,
              reviewBoard,
              reviewCategory,
              scope: effectiveScope,
              petTypeId,
              petTypeIds,
              q: query || undefined,
              searchIn: selectedSearchIn,
              excludeTypes: isAuthenticated ? undefined : blockedTypesForGuest,
              neighborhoodId,
              minLikes: 1,
              viewerId: user?.id,
            }).catch((error) => {
              if (isPrismaDatabaseUnavailableError(error)) {
                return [];
              }
              throw error;
            });

            return { items, nextCursor: null };
          },
        }),
      );

      totalPages = bestPage.totalPages;
      resolvedPage = bestPage.resolvedPage;
      bestItems = bestPage.page.items;
    } else {
      const allPage = await feedPerf.measure("page_query.all", () =>
        resolveFeedPageSlice<FeedListItem>({
          currentPage,
          limit,
          skipCountOnFirstPage: true,
          countItems: () =>
            countPosts({
              type,
              reviewBoard,
              reviewCategory,
              scope: effectiveScope,
              petTypeId,
              petTypeIds,
              q: query || undefined,
              searchIn: selectedSearchIn,
              days: periodDays ?? undefined,
              excludeTypes: isAuthenticated ? undefined : blockedTypesForGuest,
              neighborhoodId,
              viewerId: user?.id,
            }).catch((error) => {
              if (isPrismaDatabaseUnavailableError(error)) {
                return 0;
              }
              throw error;
            }),
          listPage: async (page) => {
            const result: FeedListResult = await listPosts({
              page,
              limit,
              type,
              reviewBoard,
              reviewCategory,
              scope: effectiveScope,
              petTypeId,
              petTypeIds,
              q: query || undefined,
              searchIn: selectedSearchIn,
              days: periodDays ?? undefined,
              sort: selectedSort,
              excludeTypes: isAuthenticated ? undefined : blockedTypesForGuest,
              neighborhoodId,
              viewerId: user?.id,
              personalized: usePersonalizedFeed,
            }).catch((error) => {
              if (isPrismaDatabaseUnavailableError(error)) {
                return { items: [], nextCursor: null };
              }
              throw error;
            });

            return result;
          },
        }),
      );

      totalPages = allPage.totalPages;
      resolvedPage = allPage.resolvedPage;
      posts = allPage.page;
    }
  }

  const items = mode === "BEST" ? bestItems : posts.items;
  const feedTitle = reviewBoard
    ? "리뷰 게시판"
    : type
      ? `${postTypeMeta[type].label} 게시판`
      : "전체 게시판";
  const normalizedReviewCategory: ReviewCategory | null = reviewCategory ?? null;
  const loginHref = (nextPath: string) =>
    `/login?next=${encodeURIComponent(nextPath)}`;
  const feedQueryKey = [
    mode,
    effectiveScope,
    type ?? "ALL",
    reviewBoard ? "REVIEW" : "GENERAL",
    reviewCategory ?? "ALL_REVIEW",
    petTypeId ?? "ALL_COMMUNITIES",
    petTypeIds.join(",") || "ALL_COMMUNITIES_MULTI",
    selectedSort,
    selectedSearchIn,
    selectedPersonalized,
    density,
    bestDays,
    periodDays ?? "ALL_TIME",
    query || "__EMPTY__",
    resolvedPage,
  ].join("|");
  const viewerUserId = user?.id ?? null;
  const shouldLoadViewerPersonalizationContext =
    Boolean(viewerUserId) && usePersonalizedFeed;
  const [
    viewerAudienceSegments,
    viewerPets,
    recentEngagementLabels,
    recentBehaviorLabels,
    recentDwellLabels,
    recentBookmarkLabels,
  ] =
    shouldLoadViewerPersonalizationContext && viewerUserId
      ? await feedPerf.measure("personalization.context", () =>
          Promise.all([
            listAudienceSegmentsByUserId(viewerUserId).catch((error) => {
              if (
                isPrismaDatabaseUnavailableError(error) ||
                isMissingAudienceSegmentQueryError(error)
              ) {
                return [];
              }
              throw error;
            }),
            listPetsByUserId(viewerUserId, { limit: 1, cacheTtlMs: 60_000 }).catch((error) => {
              if (isPrismaDatabaseUnavailableError(error)) {
                return [];
              }
              throw error;
            }),
            listViewerRecentEngagementSummaryLabels(viewerUserId).catch((error) => {
              if (
                isPrismaDatabaseUnavailableError(error) ||
                error instanceof Prisma.PrismaClientKnownRequestError
              ) {
                return [];
              }
              throw error;
            }),
            listViewerRecentBehaviorSummaryLabels(viewerUserId).catch((error) => {
              if (
                isPrismaDatabaseUnavailableError(error) ||
                error instanceof Prisma.PrismaClientKnownRequestError
              ) {
                return [];
              }
              throw error;
            }),
            listViewerRecentDwellSummaryLabels(viewerUserId).catch((error) => {
              if (
                isPrismaDatabaseUnavailableError(error) ||
                error instanceof Prisma.PrismaClientKnownRequestError
              ) {
                return [];
              }
              throw error;
            }),
            listViewerRecentBookmarkSummaryLabels(viewerUserId).catch((error) => {
              if (
                isPrismaDatabaseUnavailableError(error) ||
                error instanceof Prisma.PrismaClientKnownRequestError
              ) {
                return [];
              }
              throw error;
            }),
          ]),
        )
      : [[], [], [], [], [], []];
  const primaryAudienceSegment = viewerAudienceSegments[0] ?? null;
  const primaryPet = viewerPets[0] ?? null;
  const feedAudienceContext = resolveFeedAudienceContext({
    segment: primaryAudienceSegment,
    fallbackPet: primaryPet,
    preferredPetTypeLabels,
    preferredInterestLabels,
    recentEngagementLabels,
    recentBehaviorLabels,
    recentDwellLabels,
    recentBookmarkLabels,
  });
  const personalizedSummary = usePersonalizedFeed
    ? buildFeedPersonalizationSummary(feedAudienceContext)
    : null;
  const adConfig =
    mode === "ALL" && effectiveScope === PostScope.GLOBAL
      ? buildFeedAdConfig(feedAudienceContext) ?? undefined
      : undefined;
  const showPersonalizedToggle =
    isAuthenticated && mode === "ALL" && effectiveScope === PostScope.GLOBAL;
  const initialFeedUploadPathnames = await feedPerf.measure("media.image_availability", () =>
    resolveRenderableUploadPathnames(
      items.flatMap((item) =>
        item.images
          .map((image) => image.url ?? "")
          .filter((url) => url.length > 0),
      ),
    ),
  );
  const initialFeedItems = buildInitialFeedItems(
    items.map((item) => ({
      ...item,
      images: filterRenderableUploadImages(item.images, initialFeedUploadPathnames),
    })),
  );

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
    nextPersonalized,
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
    nextPersonalized?: FeedPersonalized | null;
    nextDensity?: FeedDensity | null;
  }) => {
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
    const resolvedSort = nextSort === undefined ? selectedSort : nextSort;
    const resolvedSearchIn =
      nextSearchIn === undefined ? selectedSearchIn : nextSearchIn;
    const resolvedPersonalized =
      nextPersonalized === undefined ? selectedPersonalized : nextPersonalized;
    const resolvedDensity = nextDensity === undefined ? density : nextDensity;
    const effectivePage = nextPage === undefined ? resolvedPage : nextPage;
    const shouldKeepReviewBoard =
      reviewBoard && resolvedType === undefined && !resolvedReviewCategory;
    const normalizedType = shouldKeepReviewBoard ? PostType.PRODUCT_REVIEW : resolvedType;

    if (normalizedType) params.set("type", normalizedType);
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
    if (resolvedQuery) params.set("q", resolvedQuery);
    if (resolvedSearchIn && resolvedSearchIn !== "ALL") {
      params.set("searchIn", resolvedSearchIn);
    }
    if (resolvedMode === "ALL" && resolvedPersonalized === "1" && isAuthenticated) {
      params.set("personalized", "1");
    }
    if (resolvedDensity === "ULTRA") {
      params.set("density", "ULTRA");
    }
    if (resolvedMode === "BEST") {
      params.set("mode", "BEST");
      params.set("days", String(resolvedDays));
    } else if (resolvedSort && resolvedSort !== "LATEST") {
      params.set("sort", resolvedSort);
      if (resolvedPeriod) {
        params.set("period", String(resolvedPeriod));
      }
    } else if (resolvedMode === "ALL" && resolvedPeriod) {
      params.set("period", String(resolvedPeriod));
    }
    if (effectivePage && effectivePage > 1) {
      params.set("page", String(effectivePage));
    }

    const serialized = params.toString();
    return serialized ? `/feed?${serialized}` : "/feed";
  };
  const footerSearchResetHref = (() => {
    const params = new URLSearchParams();
    if (type) {
      params.set("type", type);
    }
    for (const value of petTypeIds) {
      params.append("petType", value);
    }
    if (normalizedReviewCategory) {
      params.set("review", normalizedReviewCategory);
    }
    if (density === "ULTRA") {
      params.set("density", "ULTRA");
    }
    const serialized = params.toString();
    return serialized ? `/feed?${serialized}` : "/feed";
  })();
  const footerSearchIn = selectedSearchIn === "CONTENT" ? "CONTENT" : "TITLE";

  feedPerf.flush({
    route: "/feed",
    mode,
    page: currentPage,
    resolvedPage,
    totalPages,
    itemCount: items.length,
    isAuthenticated,
    isGuestTypeBlocked,
    feedScope: effectiveScope,
    personalized: usePersonalizedFeed,
    requestedType: type ?? null,
    reviewBoard,
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
                    ? "tp-text-card-title mt-0.5 text-[#1e3f74]"
                    : "tp-text-page-title-sm mt-0.5 text-[#1e3f74]"
                }
              >
                {feedTitle}
              </h1>
              </div>
            </div>
          </header>

          <a
            href="#feed-list"
            className="tp-btn-soft hidden h-[30px] w-fit items-center px-2.5 text-[11px] font-semibold leading-none sm:inline-flex lg:hidden"
          >
            목록 바로가기
          </a>

        {isGuestTypeBlocked && type ? (
          <div className="border border-[#d9c38b] bg-[#fff8e5] px-3 py-2.5 text-sm text-[#6c5319]">
            선택한 게시판({postTypeMeta[type].label})은 로그인 후 볼 수 있습니다.{" "}
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
          reviewCategory={normalizedReviewCategory}
          makeHref={makeHref}
          personalized={
            showPersonalizedToggle
              ? {
                  active: usePersonalizedFeed,
                  currentLabel: feedAudienceContext.label ?? null,
                  title: personalizedSummary?.title,
                  description: personalizedSummary?.description,
                  emphasis: personalizedSummary?.emphasis,
                  profileHref: "/profile",
                }
              : null
          }
        />

        <section id="feed-list" className="animate-fade-up overflow-hidden rounded-xl border border-[#d9e5f7] bg-white">
          {items.length === 0 ? (
            <EmptyState
              title={mode === "BEST" ? "반응 많은 글이 없습니다" : "게시글이 없습니다"}
              description={
                isGuestTypeBlocked
                  ? "해당 게시판은 로그인 후 확인할 수 있습니다."
                  : mode === "BEST"
                  ? "선택한 게시판과 기간에서 좋아요가 1개 이상인 글이 아직 없습니다."
                  : "글을 작성하거나 다른 게시판을 확인해 주세요."
              }
              actionHref={
                isGuestTypeBlocked
                  ? loginHref(`/feed${type ? `?type=${type}` : ""}`)
                  : mode === "BEST"
                    ? "/feed?mode=ALL"
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
              initialItems={initialFeedItems}
              initialNextCursor={null}
              mode={mode}
              preferGuestDetail={!isAuthenticated}
              query={{
                type,
                scope: effectiveScope,
                petTypeId,
                petTypeIds,
                reviewCategory,
                q: query || undefined,
                searchIn: selectedSearchIn,
                sort: selectedSort,
                days: periodDays ?? undefined,
                personalized: usePersonalizedFeed,
              }}
              queryKey={feedQueryKey}
              adConfig={adConfig}
              personalizationTracking={
                usePersonalizedFeed
                  ? {
                      surface: "FEED",
                      audienceKey: feedAudienceContext.audienceKey,
                      breedCode: feedAudienceContext.breedCode,
                      audienceSource: toFeedAudienceSourceValue(
                        feedAudienceContext.source,
                      ),
                    }
                  : undefined
              }
            />
          )}
          {items.length > 0 ? (
            <FeedPagination
              resolvedPage={resolvedPage}
              totalPages={totalPages}
              makeHref={makeHref}
            />
          ) : null}
          <FeedFooterSearchForm
            actionPath="/feed"
            query={query}
            searchIn={footerSearchIn}
            resetHref={footerSearchResetHref}
            type={type}
            petTypeIds={petTypeIds}
            reviewCategory={normalizedReviewCategory}
          />
        </section>

        <div className="flex justify-end gap-2">
          <Link
            href="/posts/new"
            className="tp-btn-primary inline-flex h-[30px] items-center justify-center px-3 text-[11px] font-semibold leading-none hover:bg-[#274f8c]"
          >
            글쓰기
          </Link>
        </div>

        </div>
      </main>
    </div>
  );
}
