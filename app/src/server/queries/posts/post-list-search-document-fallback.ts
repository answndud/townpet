import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { withEmptyReactions } from "./post-engagement-support";
import {
  buildPostListInclude,
  buildPostListIncludeWithoutReactions,
} from "./post-list-includes";
import { rankPostSearchDocumentFallbackRows } from "./post-ranked-search-support";
import type { PostSearchIn } from "./post-search-support";

type PostListSearchDocumentFallbackRow =
  | Prisma.PostGetPayload<{ include: ReturnType<typeof buildPostListInclude> }>
  | Prisma.PostGetPayload<{
      include: ReturnType<typeof buildPostListIncludeWithoutReactions>;
    }>;

export async function fetchRankedPostListSearchDocumentFallback({
  where,
  take,
  orderBy,
  includeViewerReactions,
  viewerId,
  includeGuestAuthor,
  noViewerId,
  query,
  searchIn,
  limit,
}: {
  where: Prisma.PostWhereInput;
  take: number;
  orderBy: Prisma.PostOrderByWithRelationInput[];
  includeViewerReactions: boolean;
  viewerId?: string;
  includeGuestAuthor: boolean;
  noViewerId: string;
  query: string;
  searchIn: PostSearchIn;
  limit: number;
}): Promise<PostListSearchDocumentFallbackRow[]> {
  const fallbackRows = await prisma.post
    .findMany({
      where,
      take,
      orderBy,
      include: includeViewerReactions
        ? buildPostListInclude(viewerId, includeGuestAuthor, noViewerId)
        : buildPostListIncludeWithoutReactions(includeGuestAuthor),
    })
    .then((rows) =>
      includeViewerReactions
        ? (rows as PostListSearchDocumentFallbackRow[])
        : withEmptyReactions(rows as PostListSearchDocumentFallbackRow[]),
    );

  const rankedRows = rankPostSearchDocumentFallbackRows({
    rows: fallbackRows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      structuredSearchText: row.structuredSearchText ?? "",
      createdAt: row.createdAt,
      author: { nickname: row.author.nickname },
      row,
    })),
    query,
    searchIn,
    limit,
    preserveInputOrderOnTie: true,
  });

  return rankedRows.map((rankedRow) => rankedRow.row);
}
