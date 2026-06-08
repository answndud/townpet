import type { PostType } from "@prisma/client";

import { isCommonBoardPostType } from "@/lib/community-board";
import { isFreeBoardPostType } from "@/lib/post-type-groups";
import type {
  FeedDensity,
  FeedMode,
  FeedSearchIn,
} from "@/lib/posts/guest-feed-types";
import { type ReviewCategory } from "@/lib/review-category";

export function buildGuestFeedHref({
  basePath,
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
  nextPersonalized,
}: {
  basePath: string;
  type: PostType | null;
  reviewBoard: boolean;
  reviewCategory: ReviewCategory | null;
  petTypeIds: string[];
  query: string;
  mode: FeedMode;
  selectedSearchIn: FeedSearchIn;
  density: FeedDensity;
  resolvedPage: number;
  nextType?: PostType | null;
  nextPetTypeId?: string | null;
  nextReviewCategory?: ReviewCategory | null;
  nextQuery?: string | null;
  nextPage?: number | null;
  nextMode?: FeedMode | null;
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
  const resolvedSearchIn = nextSearchIn == null ? selectedSearchIn : nextSearchIn;
  const resolvedDensity = nextDensity == null ? density : nextDensity;
  const effectivePage = nextPage === undefined ? resolvedPage : nextPage;
  const shouldKeepReviewBoard =
    reviewBoard && resolvedType === null && !resolvedReviewCategory;
  const normalizedType = shouldKeepReviewBoard ? "PRODUCT_REVIEW" : resolvedType;

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
  }
  if (effectivePage && effectivePage > 1) {
    params.set("page", String(effectivePage));
  }
  const serialized = params.toString();
  return serialized ? `${basePath}?${serialized}` : basePath;
}

export function shouldReplaceGuestFeedCanonicalHref({
  canonicalHref,
  currentHref,
  loadedQueryString,
  queryString,
}: {
  canonicalHref: string;
  currentHref: string;
  loadedQueryString: string | null;
  queryString: string;
}) {
  return loadedQueryString === queryString && canonicalHref !== currentHref;
}
