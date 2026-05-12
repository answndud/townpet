import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { buildVisibleAuthorFilter } from "@/lib/sanction-visibility";
import {
  isUnavailableReactionsIncludeError,
  markPostReactionsUnsupported,
  supportsPostReactionsField,
  withEmptyReactions,
} from "./post-engagement-support";
import {
  buildPostListInclude,
  buildPostListIncludeWithoutReactions,
} from "./post-list-includes";

type RankedSearchHydratedPost =
  | Prisma.PostGetPayload<{ include: ReturnType<typeof buildPostListInclude> }>
  | Prisma.PostGetPayload<{
      include: ReturnType<typeof buildPostListIncludeWithoutReactions>;
    }>;

export async function hydrateRankedSearchPostsByIds({
  candidateIds,
  hiddenAuthorIds,
  safeLimit,
  includeViewerReactions,
  viewerId,
  includeGuestAuthor,
  noViewerId,
  isUnknownGuestAuthorIncludeError,
}: {
  candidateIds: string[];
  hiddenAuthorIds: string[];
  safeLimit: number;
  includeViewerReactions: boolean;
  viewerId?: string;
  includeGuestAuthor: boolean;
  noViewerId: string;
  isUnknownGuestAuthorIncludeError: (error: unknown) => boolean;
}): Promise<RankedSearchHydratedPost[]> {
  if (candidateIds.length === 0) {
    return [];
  }

  const baseArgs: Omit<Prisma.PostFindManyArgs, "include"> = {
    where: {
      id: { in: candidateIds },
      ...(hiddenAuthorIds.length > 0 ? { authorId: { notIn: hiddenAuthorIds } } : {}),
      author: buildVisibleAuthorFilter(),
    },
  };

  const fetchedPosts =
    !supportsPostReactionsField() || !includeViewerReactions
      ? withEmptyReactions(
          (await prisma.post.findMany({
            ...baseArgs,
            include: buildPostListIncludeWithoutReactions(includeGuestAuthor),
          })) as RankedSearchHydratedPost[],
        )
      : await prisma.post
          .findMany({
            ...baseArgs,
            include: buildPostListInclude(viewerId, includeGuestAuthor, noViewerId),
          })
          .catch(async (error) => {
            if (!isUnavailableReactionsIncludeError(error) && !isUnknownGuestAuthorIncludeError(error)) {
              throw error;
            }

            if (isUnavailableReactionsIncludeError(error)) {
              markPostReactionsUnsupported();
            }

            if (isUnknownGuestAuthorIncludeError(error)) {
              return prisma.post.findMany({
                ...baseArgs,
                include: buildPostListInclude(viewerId, false, noViewerId),
              });
            }

            const fallbackItems = await prisma.post.findMany({
              ...baseArgs,
              include: buildPostListIncludeWithoutReactions(includeGuestAuthor),
            });
            return withEmptyReactions(fallbackItems as RankedSearchHydratedPost[]);
          });

  const byId = new Map(fetchedPosts.map((item) => [item.id, item]));
  return candidateIds
    .map((id) => byId.get(id))
    .filter((item): item is (typeof fetchedPosts)[number] => Boolean(item))
    .slice(0, safeLimit);
}
