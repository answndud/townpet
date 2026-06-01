import { Prisma } from "@prisma/client";

export type PostListSort = "LATEST" | "LIKE" | "COMMENT";
export const DEFAULT_POST_LIST_SORT: PostListSort = "LATEST";

export type PostFindManyBaseArgs = Omit<Prisma.PostFindManyArgs, "include" | "select">;

export function buildPostListOrderBy(
  sort: PostListSort,
): Prisma.PostOrderByWithRelationInput[] {
  return sort === "LIKE"
    ? [
        { likeCount: "desc" },
        { commentCount: "desc" },
        { createdAt: "desc" },
        { id: "desc" },
      ]
    : sort === "COMMENT"
      ? [
          { commentCount: "desc" },
          { likeCount: "desc" },
          { createdAt: "desc" },
          { id: "desc" },
        ]
      : [{ createdAt: "desc" }, { id: "desc" }];
}

export function buildPostListFindManyBaseArgs({
  where,
  limit,
  page,
  cursor,
  orderBy,
}: {
  where: Prisma.PostWhereInput;
  limit: number;
  page: number;
  cursor?: string;
  orderBy: Prisma.PostOrderByWithRelationInput[];
}): PostFindManyBaseArgs {
  return {
    where,
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : page > 1
        ? {
            skip: (page - 1) * limit,
          }
        : {}),
    orderBy,
  };
}

export function buildBestPostListFindManyBaseArgs({
  where,
  limit,
  page,
}: {
  where: Prisma.PostWhereInput;
  limit: number;
  page: number;
}): PostFindManyBaseArgs {
  return {
    where,
    take: limit,
    ...(page > 1
      ? {
          skip: (page - 1) * limit,
        }
      : {}),
    orderBy: [
      { popularPromotedAt: "desc" },
      { createdAt: "desc" },
      { id: "desc" },
    ],
  };
}
