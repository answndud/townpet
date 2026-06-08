import { PostScope, PostType } from "@prisma/client";
import { z } from "zod";

import { FEED_PAGE_SIZE } from "@/lib/feed";
import { isCommonBoardPostType } from "@/lib/community-board";
import { buildFeedSignalContent } from "@/lib/feed-list-presenter";
import { normalizeFeedPetTypeIds } from "@/lib/feed-pet-type-filter";
import { isLoginRequiredPostType } from "@/lib/post-access";
import { getPostTypeMeta } from "@/lib/post-presenter";
import { isFreeBoardPostType } from "@/lib/post-type-groups";
import type {
  FeedDensity,
  FeedMode,
  FeedSearchIn,
  GuestFeedPayload,
  GuestFeedView,
} from "@/lib/posts/guest-feed-types";
import { sanitizePublicGuestIdentity } from "@/lib/public-guest-identity";
import { REVIEW_CATEGORY, REVIEW_CATEGORY_VALUES } from "@/lib/review-category";
import { isLocalRequiredPostType } from "@/lib/post-scope-policy";
import { postListSchema, toPostListInput } from "@/lib/validations/post";
import { isPrismaDatabaseUnavailableError } from "@/server/prisma-database-error";
import { listCommunityNavItems } from "@/server/queries/community.queries";
import { getGuestReadLoginRequiredPostTypes } from "@/server/queries/policy.queries";
import {
  countBestPosts,
  countPosts,
  listBestPosts,
  listPosts,
} from "@/server/queries/post.queries";
import { createFeedPagePerformanceTracker } from "@/server/services/posts/feed-page-performance.service";
import { resolveFeedPageSlice } from "@/server/services/posts/feed-page-query.service";
import { ServiceError } from "@/server/services/service-error";
import {
  filterRenderableUploadImages,
  resolveRenderableUploadPathnames,
} from "@/server/upload-renderable-assets";

type GuestFeedListResult = Awaited<ReturnType<typeof listPosts>>;
type GuestFeedListItem = GuestFeedListResult["items"][number];
type GuestBestFeedItems = Awaited<ReturnType<typeof listBestPosts>>;
type GuestBestFeedItem = GuestBestFeedItems[number];
type GuestFeedPerformanceTracker = ReturnType<typeof createFeedPagePerformanceTracker>;
type GuestFeedPerformanceSummary = ReturnType<GuestFeedPerformanceTracker["flush"]>;

type SerializedLostFoundAlert = {
  alertType: string | null;
  petType: string | null;
  breed: string | null;
  lastSeenAt: string | null;
  lastSeenLocation: string | null;
  status: string | null;
};

export type GuestFeedCursorPayload = {
  items: Awaited<ReturnType<typeof serializeFeedItems>>;
  nextCursor: string | null;
};

export type GuestFeedPageServiceResult =
  | {
      kind: "feed";
      data: GuestFeedPayload;
      perfSummary: GuestFeedPerformanceSummary;
    }
  | {
      kind: "cursor";
      data: GuestFeedCursorPayload;
      perfSummary: GuestFeedPerformanceSummary;
    };

const guestFeedQuerySchema = z.object({
  type: z.nativeEnum(PostType).optional(),
  q: z.string().trim().max(100).optional(),
  mode: z.enum(["ALL", "BEST"]).optional(),
  days: z.coerce.number().int().optional(),
  period: z.coerce.number().int().optional(),
  sort: z.enum(["LATEST", "LIKE", "COMMENT"]).optional(),
  searchIn: z.enum(["ALL", "TITLE_CONTENT", "TITLE", "CONTENT", "AUTHOR"]).optional(),
  review: z.enum(REVIEW_CATEGORY_VALUES).optional(),
  personalized: z.enum(["0", "1"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  cursor: z.string().trim().min(1).optional(),
});

export function buildServerTimingHeader(phases: Record<string, number>, totalMs: number) {
  const entries = Object.entries(phases).map(
    ([name, durationMs]) => `${name};dur=${durationMs.toFixed(1)}`,
  );
  entries.push(`total;dur=${totalMs.toFixed(1)}`);
  return entries.join(", ");
}

function toFeedMode(value?: string): FeedMode {
  return value === "BEST" ? "BEST" : "ALL";
}

function toFeedSearchIn(value?: string): FeedSearchIn {
  if (value === "TITLE_CONTENT" || value === "TITLE" || value === "CONTENT" || value === "AUTHOR") {
    return value;
  }
  return "ALL";
}

function toFeedDensity(value?: string): FeedDensity {
  return value === "ULTRA" ? "ULTRA" : "DEFAULT";
}

function invalidQueryError() {
  return new ServiceError("잘못된 요청 파라미터입니다.", "INVALID_QUERY", 400);
}

function serializeLostFoundAlert(value: unknown): SerializedLostFoundAlert | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const alert = value as {
    alertType?: string | null;
    petType?: string | null;
    breed?: string | null;
    lastSeenAt?: Date | string | null;
    lastSeenLocation?: string | null;
    status?: string | null;
  };

  return {
    alertType: alert.alertType ?? null,
    petType: alert.petType ?? null,
    breed: alert.breed ?? null,
    lastSeenAt:
      alert.lastSeenAt instanceof Date
        ? alert.lastSeenAt.toISOString()
        : alert.lastSeenAt ?? null,
    lastSeenLocation: alert.lastSeenLocation ?? null,
    status: alert.status ?? null,
  };
}

async function serializeFeedItems(
  items: Array<Record<string, unknown>>,
): Promise<GuestFeedView["feed"]["items"]> {
  const imageUrls = items.flatMap((item) =>
    (((item.images as Array<{ url?: string | null }> | undefined) ?? [])
      .map((image) => image.url ?? "")
      .filter((url) => url.length > 0)),
  );
  const renderableUploadPathnames = await resolveRenderableUploadPathnames(imageUrls);

  return items.map((rawPost) => {
    const post = sanitizePublicGuestIdentity(rawPost);
    const renderableImages = filterRenderableUploadImages(
      (post.images as Array<{ id: string; url?: string | null }> | undefined) ?? [],
      renderableUploadPathnames,
    );
    const isOperatorContent = Boolean(
      (post as { isOperatorContent?: boolean | null }).isOperatorContent,
    );
    const operatorLastVerifiedAtValue = (post as {
      operatorLastVerifiedAt?: Date | string | null;
    }).operatorLastVerifiedAt;
    const operatorLastVerifiedAt =
      operatorLastVerifiedAtValue instanceof Date
        ? operatorLastVerifiedAtValue.toISOString()
        : ((operatorLastVerifiedAtValue ?? null) as string | null);
    const author = post.author as {
      id: string;
      nickname?: string | null;
      isFoundingMember?: boolean | null;
    };
    const guestAuthorId = ((post as { guestAuthorId?: string | null }).guestAuthorId ??
      null) as string | null;
    const guestDisplayName = ((post as { guestDisplayName?: string | null }).guestDisplayName ??
      null) as string | null;
    const neighborhood = post.neighborhood as
      | {
          name: string;
          city: string;
        }
      | null
      | undefined;
    const petType = (post as {
      petType?: {
        labelKo: string;
        category: { labelKo: string };
      } | null;
    }).petType;
    const marketListing =
      (post as {
        marketListing?: {
          listingType?: string | null;
          price?: number | null;
          condition?: string | null;
          depositAmount?: number | null;
          rentalPeriod?: string | null;
          status?: string | null;
        } | null;
      }).marketListing ?? null;
    const lostFoundAlert = serializeLostFoundAlert(
      (post as { lostFoundAlert?: unknown }).lostFoundAlert,
    );

    return {
      id: post.id,
      type: post.type,
      status: post.status,
      title: post.title,
      content: buildFeedSignalContent(String(post.content ?? "")),
      commentCount: post.commentCount,
      likeCount: post.likeCount,
      viewCount: post.viewCount,
      createdAt:
        post.createdAt instanceof Date
          ? post.createdAt.toISOString()
          : String(post.createdAt),
      author: {
        id: author.id,
        nickname: (author.nickname ?? null) as string | null,
        ...(author.isFoundingMember ? { isFoundingMember: true } : {}),
      },
      images: renderableImages.map((image) => ({
        id: image.id,
        url: image.url ?? null,
      })),
      ...(isOperatorContent
        ? {
            isOperatorContent: true,
            operatorSourceName:
              ((post as { operatorSourceName?: string | null }).operatorSourceName ?? null) as
                | string
                | null,
            operatorLastVerifiedAt,
          }
        : {}),
      ...(guestAuthorId ? { guestAuthorId } : {}),
      ...(guestDisplayName ? { guestDisplayName } : {}),
      ...(neighborhood
        ? {
            neighborhood: {
              name: neighborhood.name,
              city: neighborhood.city,
            },
          }
        : {}),
      ...(petType
        ? {
            petType: {
              labelKo: petType.labelKo,
              categoryLabelKo: petType.category.labelKo,
            },
          }
        : {}),
      ...(marketListing ? { marketListing } : {}),
      ...(lostFoundAlert ? { lostFoundAlert } : {}),
    };
  }) as GuestFeedView["feed"]["items"];
}

export async function buildGuestFeedPageServiceResult({
  searchParams,
  tracker,
  route,
}: {
  searchParams: URLSearchParams;
  tracker: GuestFeedPerformanceTracker;
  route: string;
}): Promise<GuestFeedPageServiceResult> {
  const petTypeQueryValues = searchParams
    .getAll("petType")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const parsedPetTypes = z.array(z.string().cuid()).max(50).safeParse(petTypeQueryValues);
  if (!parsedPetTypes.success) {
    throw invalidQueryError();
  }

  const parsed = guestFeedQuerySchema.safeParse({
    type: searchParams.get("type") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    mode: searchParams.get("mode") ?? undefined,
    days: searchParams.get("days") ?? undefined,
    period: searchParams.get("period") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
    searchIn: searchParams.get("searchIn") ?? undefined,
    review: searchParams.get("review") ?? undefined,
    personalized: searchParams.get("personalized") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  });
  if (!parsed.success) {
    throw invalidQueryError();
  }

  const isCursorPagination = Boolean(parsed.data.cursor?.trim());
  const loginRequiredTypes = await tracker.measure("bootstrap.policy", () =>
    getGuestReadLoginRequiredPostTypes(),
  );
  const parsedParams = postListSchema.safeParse({
    ...parsed.data,
    petType: parsedPetTypes.data[0],
    limit: FEED_PAGE_SIZE,
  });
  const listInput = parsedParams.success ? toPostListInput(parsedParams.data) : null;
  const requestedType = listInput?.type;
  const requestedReviewCategory = listInput?.reviewCategory;
  const isLegacyReviewType =
    requestedType === PostType.PLACE_REVIEW || requestedType === PostType.PRODUCT_REVIEW;
  const type = isLegacyReviewType ? null : requestedType ?? null;
  const reviewCategory =
    requestedReviewCategory ??
    (requestedType === PostType.PLACE_REVIEW ? REVIEW_CATEGORY.PLACE : undefined);
  const reviewBoard = isLegacyReviewType || Boolean(reviewCategory);
  const requestedPetTypeId = listInput?.petTypeId;
  const needsPetTypeCatalog = parsedPetTypes.data.length > 0 || Boolean(requestedPetTypeId);
  const allPetTypeIds = needsPetTypeCatalog
    ? await tracker.measure("bootstrap.communities", async () => {
        const communities = await listCommunityNavItems(50).catch((error) => {
          if (isPrismaDatabaseUnavailableError(error)) {
            return [];
          }
          throw error;
        });
        return communities.map((item) => item.id);
      })
    : [];
  const requestedPetTypeIds = normalizeFeedPetTypeIds(
    parsedPetTypes.data.length > 0
      ? parsedPetTypes.data
      : requestedPetTypeId
        ? [requestedPetTypeId]
        : [],
    allPetTypeIds,
  );
  const isCommonBoardType = type ? isCommonBoardPostType(type) : false;
  const isFreeBoardType = type ? isFreeBoardPostType(type) : false;
  const petTypeIds =
    isCommonBoardType || isFreeBoardType
      ? []
      : requestedPetTypeIds.length > 0
        ? requestedPetTypeIds
        : [];
  const petTypeId = petTypeIds[0] ?? null;
  const effectiveScope = PostScope.GLOBAL;
  const mode = toFeedMode(parsed.data.mode);
  const selectedSearchIn = toFeedSearchIn(parsed.data.searchIn);
  const density = toFeedDensity(searchParams.get("density") ?? undefined);
  const isGuestTypeBlocked = isLoginRequiredPostType(requestedType, loginRequiredTypes);
  const isLocalRequiredType = isLocalRequiredPostType(type ?? undefined);
  const query = listInput?.q?.trim() ?? "";
  const requestedPage = parsed.data.page ?? 1;
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const cursor = parsed.data.cursor?.trim() || undefined;

  if (isLocalRequiredType && type) {
    const typeLabel = getPostTypeMeta(type).label;
    const perfSummary = tracker.flush({
      route,
      mode,
      page: currentPage,
      isAuthenticated: false,
      isGuestTypeBlocked: false,
      feedScope: effectiveScope,
      personalized: false,
      requestedType: type ?? null,
      reviewBoard,
    });
    return {
      kind: "feed",
      data: {
        view: "gate",
        gate: {
          title: "로그인 후 이용할 수 있습니다.",
          description: `${typeLabel}은 동네 설정 후 볼 수 있습니다. 로그인 후 대표 동네를 설정해 주세요.`,
          primaryLink: `/login?next=${encodeURIComponent(`/feed?type=${type}`)}`,
          primaryLabel: "로그인하기",
          secondaryLink: "/feed",
          secondaryLabel: "전체 피드",
        },
      },
      perfSummary,
    };
  }

  if (isCursorPagination) {
    const posts = !isGuestTypeBlocked
      ? await tracker.measure("page_query.cursor", () =>
          listPosts({
            cursor,
            limit: FEED_PAGE_SIZE,
            type: type ?? undefined,
            reviewBoard,
            reviewCategory,
            scope: effectiveScope,
            petTypeId: requestedPetTypeIds[0] ?? undefined,
            petTypeIds: requestedPetTypeIds,
            q: query || undefined,
            searchIn: selectedSearchIn,
            sort: "LATEST",
            excludeTypes: loginRequiredTypes,
            neighborhoodId: undefined,
            viewerId: undefined,
            personalized: false,
          }).catch((error) => {
            if (isPrismaDatabaseUnavailableError(error)) {
              return { items: [], nextCursor: null };
            }
            throw error;
          }),
        )
      : { items: [], nextCursor: null };
    const perfSummary = tracker.flush({
      route,
      mode,
      page: currentPage,
      isAuthenticated: false,
      isGuestTypeBlocked,
      feedScope: effectiveScope,
      personalized: false,
      requestedType: type ?? null,
      reviewBoard,
    });

    return {
      kind: "cursor",
      data: {
        items: await serializeFeedItems(posts.items as Array<Record<string, unknown>>),
        nextCursor: posts.nextCursor,
      },
      perfSummary,
    };
  }

  let totalPages = 1;
  let resolvedPage = currentPage;
  let posts: GuestFeedListResult = { items: [], nextCursor: null };
  let bestItems: GuestBestFeedItems = [];

  if (!isGuestTypeBlocked) {
    if (mode === "BEST") {
      const bestPage = await tracker.measure("page_query.best", () =>
        resolveFeedPageSlice<GuestBestFeedItem>({
          currentPage,
          limit: FEED_PAGE_SIZE,
          countItems: () =>
            countBestPosts({
              type: type ?? undefined,
              reviewBoard,
              reviewCategory,
              scope: effectiveScope,
              petTypeId: petTypeId ?? undefined,
              petTypeIds,
              q: query || undefined,
              searchIn: selectedSearchIn,
              excludeTypes: loginRequiredTypes,
              neighborhoodId: undefined,
              viewerId: undefined,
            }).catch((error) => {
              if (isPrismaDatabaseUnavailableError(error)) {
                return 0;
              }
              throw error;
            }),
          listPage: async (page) => {
            const items: GuestBestFeedItems = await listBestPosts({
              limit: FEED_PAGE_SIZE,
              page,
              type: type ?? undefined,
              reviewBoard,
              reviewCategory,
              scope: effectiveScope,
              petTypeId: petTypeId ?? undefined,
              petTypeIds,
              q: query || undefined,
              searchIn: selectedSearchIn,
              excludeTypes: loginRequiredTypes,
              neighborhoodId: undefined,
              viewerId: undefined,
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
      const allPage = await tracker.measure("page_query.all", () =>
        resolveFeedPageSlice<GuestFeedListItem>({
          currentPage,
          limit: FEED_PAGE_SIZE,
          skipCountOnFirstPage: true,
          countItems: () =>
            countPosts({
              type: type ?? undefined,
              reviewBoard,
              reviewCategory,
              scope: effectiveScope,
              petTypeId: petTypeId ?? undefined,
              petTypeIds,
              q: query || undefined,
              searchIn: selectedSearchIn,
              excludeTypes: loginRequiredTypes,
              neighborhoodId: undefined,
              viewerId: undefined,
            }).catch((error) => {
              if (isPrismaDatabaseUnavailableError(error)) {
                return 0;
              }
              throw error;
            }),
          listPage: async (page) => {
            const result: GuestFeedListResult = await listPosts({
              page,
              limit: FEED_PAGE_SIZE,
              type: type ?? undefined,
              reviewBoard,
              reviewCategory,
              scope: effectiveScope,
              petTypeId: petTypeId ?? undefined,
              petTypeIds,
              q: query || undefined,
              searchIn: selectedSearchIn,
              sort: "LATEST",
              excludeTypes: loginRequiredTypes,
              neighborhoodId: undefined,
              viewerId: undefined,
              personalized: false,
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
      ? `${getPostTypeMeta(type).label} 게시판`
      : "전체 게시판";
  const feedQueryKey = [
    mode,
    effectiveScope,
    type ?? "ALL",
    reviewBoard ? "REVIEW" : "GENERAL",
    reviewCategory ?? "ALL_REVIEW",
    petTypeId ?? "ALL_COMMUNITIES",
    petTypeIds.join(",") || "ALL_COMMUNITIES_MULTI",
    selectedSearchIn,
    density,
    "ALL_TIME_POPULAR",
    query || "__EMPTY__",
    resolvedPage,
  ].join("|");

  const perfSummary = tracker.flush({
    route,
    mode,
    page: currentPage,
    resolvedPage,
    totalPages,
    itemCount: items.length,
    isAuthenticated: false,
    isGuestTypeBlocked,
    feedScope: effectiveScope,
    personalized: false,
    requestedType: type ?? null,
    reviewBoard,
  });

  return {
    kind: "feed",
    data: {
      view: "feed",
      feed: {
        mode,
        type,
        reviewBoard,
        reviewCategory: reviewCategory ?? null,
        petTypeId,
        petTypeIds,
        query,
        selectedSort: "LATEST",
        selectedSearchIn,
        density,
        bestDays: null,
        periodDays: null,
        isGuestTypeBlocked,
        feedTitle,
        totalPages,
        resolvedPage,
        feedQueryKey,
        items: await serializeFeedItems(items as Array<Record<string, unknown>>),
        nextCursor: null,
      },
    },
    perfSummary,
  };
}
