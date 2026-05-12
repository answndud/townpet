import { PostScope, PostStatus, PostType, Prisma } from "@prisma/client";

import { buildVisibleAuthorFilter } from "@/lib/sanction-visibility";
import {
  expandExcludedPostTypes,
  getEquivalentPostTypes,
  isFreeBoardPostType,
} from "@/lib/post-type-groups";
import type { ReviewCategory } from "@/lib/review-category";
import { buildPostSearchWhere, type PostSearchIn } from "./post-search-support";

const REVIEW_BOARD_TYPES = [PostType.PLACE_REVIEW, PostType.PRODUCT_REVIEW] as const;

function normalizeBreedCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

export function toLegacyReviewTypeFallback(
  type: PostType | undefined,
  reviewCategory?: ReviewCategory,
) {
  if (type) {
    return type;
  }
  if (!reviewCategory) {
    return undefined;
  }

  if (reviewCategory === "PLACE") {
    return PostType.PLACE_REVIEW;
  }

  return PostType.PRODUCT_REVIEW;
}

export function buildPostListWhere({
  type,
  reviewBoard,
  reviewCategory,
  scope,
  petTypeId,
  petTypeIds,
  q,
  searchIn,
  excludeTypes,
  neighborhoodId,
  hiddenAuthorIds,
  days,
  authorBreedCode,
}: {
  type?: PostType;
  reviewBoard?: boolean;
  reviewCategory?: ReviewCategory;
  scope: PostScope;
  petTypeId?: string;
  petTypeIds?: string[];
  q?: string;
  searchIn: PostSearchIn;
  excludeTypes: PostType[];
  neighborhoodId?: string;
  hiddenAuthorIds: string[];
  days?: number;
  authorBreedCode?: string;
}): Prisma.PostWhereInput {
  const since = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;
  const typeFilter = type ? getEquivalentPostTypes(type) : null;
  const shouldIgnorePetTypeFilter = typeFilter
    ? typeFilter.some((item) => isFreeBoardPostType(item))
    : false;
  const expandedExcludeTypes = expandExcludedPostTypes(excludeTypes);
  const normalizedAuthorBreedCode = normalizeBreedCode(authorBreedCode);
  const normalizedPetTypeIds =
    petTypeIds && petTypeIds.length > 0 ? Array.from(new Set(petTypeIds)) : [];
  const breedFilter = normalizedAuthorBreedCode
    ? {
        author: {
          pets: {
            some: {
              breedCode: normalizedAuthorBreedCode,
            },
          },
        },
      }
    : null;
  const visibilityFilter: Prisma.PostWhereInput = {
    author: buildVisibleAuthorFilter(),
  };
  const andFilters = [...(breedFilter ? [breedFilter] : []), visibilityFilter];

  return {
    status: PostStatus.ACTIVE,
    ...(typeFilter
      ? {
          type:
            typeFilter.length === 1
              ? typeFilter[0]
              : {
                  in: typeFilter,
                },
        }
      : reviewBoard
        ? { type: { in: [...REVIEW_BOARD_TYPES] } }
        : expandedExcludeTypes.length > 0
          ? { type: { notIn: expandedExcludeTypes } }
          : {}),
    ...(reviewCategory ? { reviewCategory } : {}),
    scope,
    ...(!shouldIgnorePetTypeFilter
      ? normalizedPetTypeIds.length > 0
        ? { petTypeId: { in: normalizedPetTypeIds } }
        : petTypeId
          ? { petTypeId }
          : {}
      : {}),
    ...(scope === PostScope.LOCAL && neighborhoodId
      ? { neighborhoodId }
      : scope === PostScope.LOCAL
        ? { neighborhoodId: "__NO_NEIGHBORHOOD__" }
        : {}),
    ...(hiddenAuthorIds.length > 0 ? { authorId: { notIn: hiddenAuthorIds } } : {}),
    ...(since ? { createdAt: { gte: since } } : {}),
    ...buildPostSearchWhere(q, searchIn),
    ...(andFilters.length > 0 ? { AND: andFilters } : {}),
  };
}

export function buildLegacyReviewPostListWhere({
  type,
  reviewCategory,
  scope,
  petTypeId,
  petTypeIds,
  q,
  searchIn,
  excludeTypes,
  neighborhoodId,
  hiddenAuthorIds,
  days,
  authorBreedCode,
}: {
  type?: PostType;
  reviewCategory?: ReviewCategory;
  scope: PostScope;
  petTypeId?: string;
  petTypeIds?: string[];
  q?: string;
  searchIn: PostSearchIn;
  excludeTypes: PostType[];
  neighborhoodId?: string;
  hiddenAuthorIds: string[];
  days?: number;
  authorBreedCode?: string;
}) {
  return buildPostListWhere({
    type: toLegacyReviewTypeFallback(type, reviewCategory),
    reviewBoard: false,
    reviewCategory: undefined,
    scope,
    petTypeId,
    petTypeIds,
    q,
    searchIn,
    excludeTypes,
    neighborhoodId,
    hiddenAuthorIds,
    days,
    authorBreedCode,
  });
}

export function isPostTypeFullyExcluded(type: PostType | undefined, excludeTypes: PostType[]) {
  if (!type) {
    return false;
  }

  const equivalentTypes = getEquivalentPostTypes(type);
  return equivalentTypes.every((value) => excludeTypes.includes(value));
}

export function buildBestPostWhere({
  days,
  minLikes,
  type,
  reviewBoard,
  reviewCategory,
  scope,
  petTypeId,
  petTypeIds,
  q,
  searchIn,
  excludeTypes,
  neighborhoodId,
  hiddenAuthorIds,
}: {
  days: number;
  minLikes: number;
  type?: PostType;
  reviewBoard?: boolean;
  reviewCategory?: ReviewCategory;
  scope: PostScope;
  petTypeId?: string;
  petTypeIds?: string[];
  q?: string;
  searchIn: PostSearchIn;
  excludeTypes: PostType[];
  neighborhoodId?: string;
  hiddenAuthorIds: string[];
}): Prisma.PostWhereInput {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return {
    ...buildPostListWhere({
      type,
      reviewBoard,
      reviewCategory,
      scope,
      petTypeId,
      petTypeIds,
      q,
      searchIn,
      excludeTypes,
      neighborhoodId,
      hiddenAuthorIds,
    }),
    likeCount: { gte: minLikes },
    createdAt: { gte: since },
  };
}

export function buildLegacyReviewBestPostWhere({
  days,
  minLikes,
  type,
  reviewCategory,
  scope,
  petTypeId,
  petTypeIds,
  q,
  searchIn,
  excludeTypes,
  neighborhoodId,
  hiddenAuthorIds,
}: {
  days: number;
  minLikes: number;
  type?: PostType;
  reviewCategory?: ReviewCategory;
  scope: PostScope;
  petTypeId?: string;
  petTypeIds?: string[];
  q?: string;
  searchIn: PostSearchIn;
  excludeTypes: PostType[];
  neighborhoodId?: string;
  hiddenAuthorIds: string[];
}) {
  return buildBestPostWhere({
    days,
    minLikes,
    type: toLegacyReviewTypeFallback(type, reviewCategory),
    reviewBoard: false,
    reviewCategory: undefined,
    scope,
    petTypeId,
    petTypeIds,
    q,
    searchIn,
    excludeTypes,
    neighborhoodId,
    hiddenAuthorIds,
  });
}
