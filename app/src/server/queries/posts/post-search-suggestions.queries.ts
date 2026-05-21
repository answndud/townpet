import { PostScope, PostStatus, PostType } from "@prisma/client";

import {
  buildSearchDocumentParts,
  matchesSearchDocumentQuery,
} from "@/lib/search-document";
import { prisma } from "@/lib/prisma";
import { buildVisibleAuthorFilter } from "@/lib/sanction-visibility";
import { buildStructuredSearchVariants } from "@/lib/structured-field-normalization";
import {
  expandExcludedPostTypes,
  getEquivalentPostTypes,
} from "@/lib/post-type-groups";
import { createQueryCacheKey, withQueryCache } from "@/server/cache/query-cache";
import { listHiddenAuthorIdsForViewer } from "@/server/queries/user-relation.queries";
import { shouldTryPostSearchDocumentFallback } from "./post-ranked-search-support";
import {
  DEFAULT_POST_SEARCH_IN,
  buildPostSearchWhere,
  listStructuredSuggestionCandidates,
  type PostSearchIn,
  type PostSearchSuggestionRow,
} from "./post-search-support";

type PostSearchSuggestionOptions = {
  q: string;
  limit: number;
  type?: PostType;
  scope: PostScope;
  searchIn?: PostSearchIn;
  excludeTypes?: PostType[];
  neighborhoodId?: string;
  viewerId?: string;
};

function isPostTypeFullyExcluded(type: PostType | undefined, excludeTypes: PostType[]) {
  if (!type) {
    return false;
  }

  const equivalentTypes = getEquivalentPostTypes(type);
  return equivalentTypes.every((value) => excludeTypes.includes(value));
}

function buildSuggestionPostTypeWhere(type: PostType | undefined, excludeTypes: PostType[]) {
  if (type) {
    const equivalentTypes = getEquivalentPostTypes(type);
    return equivalentTypes.length === 1
      ? { type: equivalentTypes[0] }
      : { type: { in: equivalentTypes } };
  }

  return excludeTypes.length > 0 ? { type: { notIn: excludeTypes } } : {};
}

function buildSuggestionNeighborhoodWhere(scope: PostScope, neighborhoodId?: string) {
  if (scope !== PostScope.LOCAL) {
    return {};
  }

  return {
    neighborhoodId: neighborhoodId ?? "__NO_NEIGHBORHOOD__",
  };
}

function buildSuggestionSelect(includeStructuredSuggestionFields: boolean) {
  return {
    title: true,
    content: true,
    ...(includeStructuredSuggestionFields ? { animalTags: true } : {}),
    author: {
      select: {
        nickname: true,
      },
    },
    ...(includeStructuredSuggestionFields
      ? {
          hospitalReview: {
            select: {
              hospitalName: true,
              visitPurpose: true,
              animalType: true,
              treatmentType: true,
            },
          },
          placeReview: {
            select: {
              placeName: true,
              placeType: true,
              address: true,
            },
          },
          walkRoute: {
            select: {
              routeName: true,
              safetyTags: true,
            },
          },
          adoptionListing: {
            select: {
              shelterName: true,
              region: true,
              animalType: true,
              breed: true,
              ageLabel: true,
              sizeLabel: true,
            },
          },
          volunteerRecruitment: {
            select: {
              shelterName: true,
              region: true,
              volunteerType: true,
            },
          },
        }
      : {}),
  };
}

export async function listPostSearchSuggestions({
  q,
  limit,
  type,
  scope,
  searchIn,
  excludeTypes,
  neighborhoodId,
  viewerId,
}: PostSearchSuggestionOptions) {
  const trimmedQuery = q.trim();
  if (trimmedQuery.length < 2) {
    return [];
  }

  const normalizedExcludeTypes = expandExcludedPostTypes(excludeTypes ?? []);
  if (isPostTypeFullyExcluded(type, normalizedExcludeTypes)) {
    return [];
  }

  const resolvedSearchIn = searchIn ?? DEFAULT_POST_SEARCH_IN;
  const queryDocument = buildSearchDocumentParts(trimmedQuery);
  const shouldTryDocumentFallback = shouldTryPostSearchDocumentFallback(trimmedQuery);
  const canonicalSuggestionCandidates =
    resolvedSearchIn === "ALL"
      ? buildStructuredSearchVariants(trimmedQuery).filter(
          (candidate) => candidate.toLowerCase() !== trimmedQuery.toLowerCase(),
        )
      : [];
  const includeStructuredSuggestionFields = resolvedSearchIn === "ALL";
  const hiddenAuthorIds = await listHiddenAuthorIdsForViewer(viewerId);
  const baseWhere = {
    status: PostStatus.ACTIVE,
    ...buildSuggestionPostTypeWhere(type, normalizedExcludeTypes),
    scope,
    ...buildSuggestionNeighborhoodWhere(scope, neighborhoodId),
    ...(hiddenAuthorIds.length > 0 ? { authorId: { notIn: hiddenAuthorIds } } : {}),
    author: buildVisibleAuthorFilter(),
  };
  const select = buildSuggestionSelect(includeStructuredSuggestionFields);

  const runSuggestions = async () =>
    prisma.post.findMany({
      where: {
        ...baseWhere,
        ...buildPostSearchWhere(trimmedQuery, resolvedSearchIn),
      },
      select,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: Math.min(Math.max(limit * 3, limit), 30),
    });

  const runSuggestionFallback = async () =>
    prisma.post.findMany({
      where: baseWhere,
      select,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: Math.min(Math.max(limit * 8, 40), 80),
    });

  const shouldCache = true;
  const rows = shouldCache
    ? await withQueryCache({
        key: await createQueryCacheKey("suggest", {
          scope,
          type: type ?? "ALL",
          q: trimmedQuery,
          searchIn: resolvedSearchIn,
          excludeTypes: normalizedExcludeTypes,
          limit,
          neighborhoodId: neighborhoodId ?? "",
          viewerId: viewerId ?? "guest",
          hiddenAuthorIds,
          hasChoseongFallback: shouldTryDocumentFallback,
        }),
        ttlSeconds: 60,
        fetcher: runSuggestions,
      })
    : await runSuggestions();

  const fallbackRows =
    rows.length === 0 && shouldTryDocumentFallback ? await runSuggestionFallback() : [];
  const candidateRows = rows.length > 0 ? rows : fallbackRows;
  const suggestions: string[] = [];
  const seen = new Set<string>();
  const addSuggestion = (
    value?: string | null,
    options?: { requireContains?: boolean; sourceValue?: string | null },
  ) => {
    const requireContains = options?.requireContains ?? true;
    const normalized = value?.trim();
    if (!normalized) {
      return;
    }
    const lower = normalized.toLowerCase();
    const sourceValue = options?.sourceValue ?? normalized;
    if (
      (requireContains && !matchesSearchDocumentQuery(sourceValue, queryDocument)) ||
      seen.has(lower)
    ) {
      return;
    }

    seen.add(lower);
    suggestions.push(normalized);
  };

  for (const canonicalSuggestion of canonicalSuggestionCandidates) {
    addSuggestion(canonicalSuggestion, { requireContains: false });
    if (suggestions.length >= limit) {
      return suggestions.slice(0, limit);
    }
  }

  for (const row of candidateRows) {
    if (resolvedSearchIn === "AUTHOR") {
      addSuggestion(row.author.nickname);
    } else {
      addSuggestion(row.title, {
        sourceValue: resolvedSearchIn === "CONTENT" ? row.content : row.title,
      });
      if (resolvedSearchIn === "ALL") {
        addSuggestion(row.author.nickname);
        for (const candidate of listStructuredSuggestionCandidates(row as PostSearchSuggestionRow)) {
          addSuggestion(candidate);
        }
      }
    }

    if (suggestions.length >= limit) {
      break;
    }
  }

  return suggestions.slice(0, limit);
}
