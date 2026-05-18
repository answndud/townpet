import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { buildVisibleAuthorFilter } from "@/lib/sanction-visibility";
import { createQueryCacheKey, withQueryCache } from "@/server/cache/query-cache";
import { listHiddenAuthorIdsForViewer } from "@/server/queries/user-relation.queries";

type PostDetailWidgetOptions<TSelect extends Prisma.PostSelect> = {
  id?: string;
  viewerId?: string;
  mode: string;
  ttlSeconds: number;
  select: TSelect;
};

export async function getPostDetailWidgetById<TSelect extends Prisma.PostSelect>({
  id,
  viewerId,
  mode,
  ttlSeconds,
  select,
}: PostDetailWidgetOptions<TSelect>) {
  if (!id) {
    return null;
  }

  const runDetailWidgetQuery = async () => {
    const hiddenAuthorIds = await listHiddenAuthorIdsForViewer(viewerId);
    const visibilityFilter: Prisma.PostWhereInput = {
      ...(hiddenAuthorIds.length > 0 ? { authorId: { notIn: hiddenAuthorIds } } : {}),
      author: buildVisibleAuthorFilter(),
    };
    const result = await prisma.post.findFirst({
      where: { id, ...visibilityFilter },
      select,
    });

    return result as Prisma.PostGetPayload<{ select: TSelect }> | null;
  };

  if (!viewerId) {
    const cacheKey = await createQueryCacheKey("post-detail", { id, mode });
    return withQueryCache({
      key: cacheKey,
      ttlSeconds,
      fetcher: runDetailWidgetQuery,
      cacheNull: false,
    });
  }

  return runDetailWidgetQuery();
}
