import { PostScope, PostStatus, PostType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getEquivalentPostTypes } from "@/lib/post-type-groups";
import { buildVisibleAuthorFilter } from "@/lib/sanction-visibility";
import { rankPostSearchDocumentFallbackRows } from "./post-ranked-search-support";
import type { PostSearchIn } from "./post-search-support";

export async function listRankedSearchDocumentFallbackCandidateIds({
  type,
  excludeTypes,
  scope,
  neighborhoodId,
  hiddenAuthorIds,
  query,
  searchIn,
  safeLimit,
}: {
  type?: PostType;
  excludeTypes: PostType[];
  scope: PostScope;
  neighborhoodId?: string;
  hiddenAuthorIds: string[];
  query: string;
  searchIn: PostSearchIn;
  safeLimit: number;
}) {
  const fallbackCandidates = await prisma.post.findMany({
    where: {
      status: PostStatus.ACTIVE,
      ...(type
        ? (() => {
            const equivalentTypes = getEquivalentPostTypes(type);
            return equivalentTypes.length === 1
              ? { type: equivalentTypes[0] }
              : { type: { in: equivalentTypes } };
          })()
        : excludeTypes.length > 0
          ? { type: { notIn: excludeTypes } }
          : {}),
      scope,
      ...(scope === PostScope.LOCAL && neighborhoodId
        ? { neighborhoodId }
        : scope === PostScope.LOCAL
          ? { neighborhoodId: "__NO_NEIGHBORHOOD__" }
          : {}),
      ...(hiddenAuthorIds.length > 0 ? { authorId: { notIn: hiddenAuthorIds } } : {}),
      author: buildVisibleAuthorFilter(),
    },
    select: {
      id: true,
      title: true,
      content: true,
      structuredSearchText: true,
      createdAt: true,
      author: {
        select: {
          nickname: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: Math.min(Math.max(safeLimit * 12, 60), 180),
  });

  return rankPostSearchDocumentFallbackRows({
    rows: fallbackCandidates,
    query,
    searchIn,
    limit: safeLimit,
  }).map((row) => row.id);
}
