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

export function resolvePostReviewCategoryFilters({
  type,
  reviewBoard,
  reviewCategory,
  reviewCategorySupported,
}: {
  type?: PostType;
  reviewBoard?: boolean;
  reviewCategory?: ReviewCategory;
  reviewCategorySupported: boolean;
}) {
  return {
    type: reviewCategorySupported
      ? type
      : toLegacyReviewTypeFallback(type, reviewCategory),
    reviewBoard: reviewCategorySupported ? reviewBoard : false,
    reviewCategory: reviewCategorySupported ? reviewCategory : undefined,
  };
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

export function buildPostCountWherePair({
  type,
  reviewBoard,
  reviewCategory,
  reviewCategorySupported,
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
  reviewCategorySupported: boolean;
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
  const effectiveFilters = resolvePostReviewCategoryFilters({
    type,
    reviewBoard,
    reviewCategory,
    reviewCategorySupported,
  });

  return {
    where: buildPostListWhere({
      ...effectiveFilters,
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
    }),
    legacyWhere: buildLegacyReviewPostListWhere({
      type,
      reviewCategory,
      scope,
      petTypeId: undefined,
      petTypeIds: undefined,
      q,
      searchIn,
      excludeTypes,
      neighborhoodId,
      hiddenAuthorIds,
      days,
      authorBreedCode,
    }),
  };
}

export function buildPostListWhereSet({
  type,
  reviewBoard,
  reviewCategory,
  reviewCategorySupported,
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
  reviewCategorySupported: boolean;
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
  const effectiveFilters = resolvePostReviewCategoryFilters({
    type,
    reviewBoard,
    reviewCategory,
    reviewCategorySupported,
  });
  const baseInput = {
    ...effectiveFilters,
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
  };

  return {
    where: buildPostListWhere(baseInput),
    legacyCompatibleWhere: buildPostListWhere({
      ...baseInput,
      petTypeId: undefined,
      petTypeIds: undefined,
    }),
    legacyReviewWhere: buildLegacyReviewPostListWhere({
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
    }),
    searchDocumentFallbackWhere: buildPostListWhere({
      ...baseInput,
      q: undefined,
    }),
  };
}

export function isPostTypeFullyExcluded(type: PostType | undefined, excludeTypes: PostType[]) {
  if (!type) {
    return false;
  }

  const equivalentTypes = getEquivalentPostTypes(type);
  return equivalentTypes.every((value) => excludeTypes.includes(value));
}

export function buildBestPostWhere({
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
  days?: number;
  minLikes?: number;
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
    isPopular: true,
    popularPromotedAt: { not: null },
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
  days?: number;
  minLikes?: number;
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

export function buildBestPostCountWherePair({
  days,
  minLikes,
  type,
  reviewBoard,
  reviewCategory,
  reviewCategorySupported,
  scope,
  petTypeId,
  petTypeIds,
  q,
  searchIn,
  excludeTypes,
  neighborhoodId,
  hiddenAuthorIds,
}: {
  days?: number;
  minLikes?: number;
  type?: PostType;
  reviewBoard?: boolean;
  reviewCategory?: ReviewCategory;
  reviewCategorySupported: boolean;
  scope: PostScope;
  petTypeId?: string;
  petTypeIds?: string[];
  q?: string;
  searchIn: PostSearchIn;
  excludeTypes: PostType[];
  neighborhoodId?: string;
  hiddenAuthorIds: string[];
}) {
  const effectiveFilters = resolvePostReviewCategoryFilters({
    type,
    reviewBoard,
    reviewCategory,
    reviewCategorySupported,
  });

  return {
    where: buildBestPostWhere({
      days,
      minLikes,
      ...effectiveFilters,
      scope,
      petTypeId,
      petTypeIds,
      q,
      searchIn,
      excludeTypes,
      neighborhoodId,
      hiddenAuthorIds,
    }),
    legacyWhere: buildLegacyReviewBestPostWhere({
      days,
      minLikes,
      type,
      reviewCategory,
      scope,
      petTypeId: undefined,
      petTypeIds: undefined,
      q,
      searchIn,
      excludeTypes,
      neighborhoodId,
      hiddenAuthorIds,
    }),
  };
}

export function buildBestPostListWhereSet({
  days,
  minLikes,
  type,
  reviewBoard,
  reviewCategory,
  reviewCategorySupported,
  scope,
  petTypeId,
  petTypeIds,
  q,
  searchIn,
  excludeTypes,
  neighborhoodId,
  hiddenAuthorIds,
}: {
  days?: number;
  minLikes?: number;
  type?: PostType;
  reviewBoard?: boolean;
  reviewCategory?: ReviewCategory;
  reviewCategorySupported: boolean;
  scope: PostScope;
  petTypeId?: string;
  petTypeIds?: string[];
  q?: string;
  searchIn: PostSearchIn;
  excludeTypes: PostType[];
  neighborhoodId?: string;
  hiddenAuthorIds: string[];
}) {
  const effectiveFilters = resolvePostReviewCategoryFilters({
    type,
    reviewBoard,
    reviewCategory,
    reviewCategorySupported,
  });
  const baseInput = {
    days,
    minLikes,
    ...effectiveFilters,
    scope,
    petTypeId,
    petTypeIds,
    q,
    searchIn,
    excludeTypes,
    neighborhoodId,
    hiddenAuthorIds,
  };

  return {
    where: buildBestPostWhere(baseInput),
    legacyCompatibleWhere: buildBestPostWhere({
      ...baseInput,
      petTypeId: undefined,
      petTypeIds: undefined,
    }),
    legacyReviewWhere: buildLegacyReviewBestPostWhere({
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
    }),
  };
}
