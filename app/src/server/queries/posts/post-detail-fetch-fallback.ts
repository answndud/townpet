import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  isUnavailableReactionsIncludeError,
  attachBookmarkStateToPost,
} from "./post-engagement-support";
import {
  attachPostDetailExtras,
  buildPostDetailBaseInclude,
  buildPostDetailBaseIncludeWithoutReactions,
} from "./post-detail-extras";
import {
  buildLegacyPostDetailSelect,
  buildLegacyPostDetailSelectWithoutReactions,
} from "./post-legacy-selects";
import { withEmptyGuestPostMetaOne } from "./post-guest-meta-fallback";

type PostDetailFallbackHandlers = {
  isUnknownGuestPostColumnError: (error: unknown) => boolean;
  isUnknownGuestAuthorIncludeError: (error: unknown) => boolean;
  onUnavailableReactions: () => void;
};

async function findPostDetailWithoutReactions({
  id,
  visibilityFilter,
  includeGuestAuthor,
  handlers,
}: {
  id: string;
  visibilityFilter: Prisma.PostWhereInput;
  includeGuestAuthor: boolean;
  handlers: PostDetailFallbackHandlers;
}) {
  return prisma.post
    .findFirst({
      where: { id, ...visibilityFilter },
      include: buildPostDetailBaseIncludeWithoutReactions(includeGuestAuthor),
    })
    .catch(async (error) => {
      if (
        !handlers.isUnknownGuestPostColumnError(error) &&
        !handlers.isUnknownGuestAuthorIncludeError(error)
      ) {
        throw error;
      }

      if (handlers.isUnknownGuestAuthorIncludeError(error)) {
        return prisma.post.findFirst({
          where: { id, ...visibilityFilter },
          include: buildPostDetailBaseIncludeWithoutReactions(false),
        });
      }

      return prisma.post.findFirst({
        where: { id, ...visibilityFilter },
        select: buildLegacyPostDetailSelectWithoutReactions(),
      });
    });
}

export async function fetchPostDetailWithFallback({
  id,
  visibilityFilter,
  viewerId,
  includeReactions,
  includeGuestAuthor,
  handlers,
}: {
  id: string;
  visibilityFilter: Prisma.PostWhereInput;
  viewerId?: string;
  includeReactions: boolean;
  includeGuestAuthor: boolean;
  handlers: PostDetailFallbackHandlers;
}) {
  if (!includeReactions) {
    const post = await findPostDetailWithoutReactions({
      id,
      visibilityFilter,
      includeGuestAuthor,
      handlers,
    });
    return attachBookmarkStateToPost(
      await attachPostDetailExtras(withEmptyGuestPostMetaOne(post)),
      viewerId,
    );
  }

  try {
    const post = await prisma.post
      .findFirst({
        where: { id, ...visibilityFilter },
        include: buildPostDetailBaseInclude(includeGuestAuthor),
      })
      .catch(async (error) => {
        if (
          !handlers.isUnknownGuestPostColumnError(error) &&
          !handlers.isUnknownGuestAuthorIncludeError(error)
        ) {
          throw error;
        }

        if (handlers.isUnknownGuestAuthorIncludeError(error)) {
          return prisma.post.findFirst({
            where: { id, ...visibilityFilter },
            include: buildPostDetailBaseInclude(false),
          });
        }

        const legacyPost = await prisma.post.findFirst({
          where: { id, ...visibilityFilter },
          select: buildLegacyPostDetailSelect(),
        });
        return withEmptyGuestPostMetaOne(legacyPost);
      });
    return attachBookmarkStateToPost(await attachPostDetailExtras(post), viewerId);
  } catch (error) {
    if (
      !isUnavailableReactionsIncludeError(error) &&
      !handlers.isUnknownGuestPostColumnError(error) &&
      !handlers.isUnknownGuestAuthorIncludeError(error)
    ) {
      throw error;
    }

    if (isUnavailableReactionsIncludeError(error)) {
      handlers.onUnavailableReactions();
    }

    const post = await findPostDetailWithoutReactions({
      id,
      visibilityFilter,
      includeGuestAuthor: !handlers.isUnknownGuestAuthorIncludeError(error),
      handlers,
    });
    return attachBookmarkStateToPost(
      await attachPostDetailExtras(withEmptyGuestPostMetaOne(post)),
      viewerId,
    );
  }
}
