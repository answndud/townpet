import Link from "next/link";
import type { Metadata } from "next";
import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PostScope, PostType } from "@prisma/client";

import { NeighborhoodGateNotice } from "@/components/neighborhood/neighborhood-gate-notice";
import { FeedControlPanel } from "@/components/posts/feed-control-panel";
import {
  FeedInfiniteList,
  type FeedPostItem,
} from "@/components/posts/feed-infinite-list";
import { EmptyState } from "@/components/ui/empty-state";
import { auth } from "@/lib/auth";
import {
  buildFeedAdConfig,
  buildFeedPersonalizationSummary,
  resolveFeedAudienceContext,
} from "@/lib/feed-personalization";
import { toFeedAudienceSourceValue } from "@/lib/feed-personalization-metrics";
import { FEED_PAGE_SIZE, shouldStripFeedPageParam } from "@/lib/feed";
import { sanitizePublicGuestIdentity } from "@/lib/public-guest-identity";
import { buildPaginationWindow } from "@/lib/pagination";
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
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
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

type FeedMode = "ALL" | "BEST";
type FeedSort = "LATEST" | "LIKE" | "COMMENT";
type FeedSearchIn = "ALL" | "TITLE" | "CONTENT" | "AUTHOR";
type FeedPersonalized = "0" | "1";
type FeedDensity = "DEFAULT" | "ULTRA";
type FeedListResult = Awaited<ReturnType<typeof listPosts>>;
type FeedListItem = FeedListResult["items"][number];
type BestFeedItems = Awaited<ReturnType<typeof listBestPosts>>;
type BestFeedItem = BestFeedItems[number];
const BEST_DAY_OPTIONS = [3, 7, 30] as const;
const FEED_PERIOD_OPTIONS = [3, 7, 30] as const;
const MAX_DEBUG_DELAY_MS = 5_000;
type BestDay = (typeof BEST_DAY_OPTIONS)[number];
type FeedPeriod = (typeof FEED_PERIOD_OPTIONS)[number];

function extractPreferredPetTypeIds(user: unknown) {
  if (!user || typeof user !== "object") {
    return [];
  }

  const preferredPetTypes = (user as { preferredPetTypes?: unknown }).preferredPetTypes;
  if (!Array.isArray(preferredPetTypes)) {
    return [];
  }

  return preferredPetTypes
    .map((item) =>
      item && typeof item === "object"
        ? (item as { petTypeId?: string | null }).petTypeId
        : null,
    )
    .filter((petTypeId): petTypeId is string => typeof petTypeId === "string");
}

export const metadata: Metadata = {
  title: "피드",
  description: "커뮤니티 게시글을 최신순/인기순으로 확인하세요.",
  alternates: {
    canonical: "/feed",
  },
  openGraph: {
    title: "TownPet 피드",
    description: "커뮤니티 게시글을 최신순/인기순으로 확인하세요.",
    url: "/feed",
  },
};

type HomePageProps = {
  searchParams?: Promise<{
    type?: PostType;
    scope?: "LOCAL" | "GLOBAL";
    petType?: string | string[];
    communityId?: string;
    q?: string;
    mode?: string;
    days?: string;
    period?: string;
    sort?: string;
    searchIn?: string;
    review?: string;
    personalized?: string;
    perf?: string;
    page?: string;
    density?: string;
    debugDelayMs?: string;
  }>;
};

async function maybeDebugDelay(value?: string) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return;
  }

  const delayMs = Math.min(MAX_DEBUG_DELAY_MS, Math.floor(numeric));
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

function toFeedMode(value?: string): FeedMode {
  return value === "BEST" ? "BEST" : "ALL";
}

function toBestDay(value?: string): BestDay {
  const numeric = Number(value);
  return BEST_DAY_OPTIONS.includes(numeric as BestDay)
    ? (numeric as BestDay)
    : 7;
}

function toFeedPeriod(value?: string): FeedPeriod | null {
  const numeric = Number(value);
  return FEED_PERIOD_OPTIONS.includes(numeric as FeedPeriod)
    ? (numeric as FeedPeriod)
    : null;
}

function toFeedSort(value?: string): FeedSort {
  if (value === "LIKE" || value === "COMMENT") {
    return value;
  }
  return "LATEST";
}

function toFeedSearchIn(value?: string): FeedSearchIn {
  if (value === "TITLE" || value === "CONTENT" || value === "AUTHOR") {
    return value;
  }
  return "ALL";
}

function toFeedPersonalized(value?: string): FeedPersonalized {
  return value === "1" ? "1" : "0";
}

function toFeedDensity(value?: string): FeedDensity {
  return value === "ULTRA" ? "ULTRA" : "DEFAULT";
}

function isMissingAudienceSegmentQueryError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2021" && error.code !== "P2022") {
    return false;
  }

  const tableName = String(error.meta?.table ?? "");
  const columnName = String(error.meta?.column ?? "");
  return (
    tableName.includes("UserAudienceSegment") ||
    columnName.includes("UserAudienceSegment")
  );
}

const getGuestFeedContext = unstable_cache(
  async () => {
    const [loginRequiredTypes] = await Promise.all([getGuestReadLoginRequiredPostTypes()]);

    return {
      loginRequiredTypes,
    };
  },
  ["feed-guest-context"],
  { revalidate: 60 },
);

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
          description={`${postTypeMeta[type].label} 게시판은 내 동네 기반으로 노출됩니다. 프로필에서 동네를 먼저 설정해 주세요.`}
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
    Boolean(viewerUserId) && mode === "ALL" && effectiveScope === PostScope.GLOBAL;
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
  const initialFeedItems: FeedPostItem[] = items.map((rawPost) => {
    const post = sanitizePublicGuestIdentity(rawPost as (typeof items)[number] & {
      guestDisplayName?: string | null;
      guestIpDisplay?: string | null;
      guestIpLabel?: string | null;
      guestAuthor?: { displayName?: string | null; ipDisplay?: string | null; ipLabel?: string | null } | null;
    });
    const petType = (post as {
      petType?: {
        id: string;
        labelKo: string;
        category: { labelKo: string };
      } | null;
    }).petType;

    return {
    id: post.id,
    type: post.type,
    scope: post.scope,
    status: post.status,
    title: post.title,
    content: post.content,
    commentCount: post.commentCount,
    likeCount: post.likeCount,
    dislikeCount: post.dislikeCount,
    viewCount: post.viewCount,
    createdAt: post.createdAt.toISOString(),
    author: {
      id: post.author.id,
      nickname: post.author.nickname,
      image: post.author.image,
    },
    guestAuthorId: (post as { guestAuthorId?: string | null }).guestAuthorId ?? null,
    guestDisplayName: (post as { guestDisplayName?: string | null }).guestDisplayName ?? null,
    neighborhood: post.neighborhood
      ? {
          id: post.neighborhood.id,
          name: post.neighborhood.name,
          city: post.neighborhood.city,
          district: post.neighborhood.district,
        }
      : null,
    petType: petType
      ? {
          id: petType.id,
          labelKo: petType.labelKo,
          categoryLabelKo: petType.category.labelKo,
        }
      : null,
    images: post.images.map((image) => ({
      id: image.id,
      url: "url" in image ? image.url : null,
    })),
    isBookmarked: Boolean((post as { isBookmarked?: boolean | null }).isBookmarked),
    reactions:
      (post as { reactions?: Array<{ type: "LIKE" | "DISLIKE" }> }).reactions?.map(
        (reaction) => ({ type: reaction.type }),
      ) ?? [],
    };
  });

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
            className="tp-btn-soft tp-btn-sm hidden w-fit items-center sm:inline-flex lg:hidden"
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
