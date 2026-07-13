import { PostScope, PostStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { isPrismaDatabaseUnavailableError } from "@/server/prisma-database-error";

export const SITEMAP_POST_PAGE_SIZE = 5_000;

type PublicSitemapPostWhereInput = {
  status: PostStatus;
  scope: PostScope;
  type: {
    notIn: readonly string[];
  };
};

export async function countPublicSitemapPosts(
  where: PublicSitemapPostWhereInput,
): Promise<number> {
  try {
    return await prisma.post.count({ where: where as Prisma.PostWhereInput });
  } catch (error) {
    if (isPrismaDatabaseUnavailableError(error)) {
      return 0;
    }
    throw error;
  }
}

export async function listPublicSitemapPosts({
  where,
  page,
}: {
  where: PublicSitemapPostWhereInput;
  page: number;
}): Promise<Array<{ id: string; updatedAt: Date }>> {
  try {
    return await prisma.post.findMany({
      where: where as Prisma.PostWhereInput,
      select: {
        id: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: Math.max(0, page) * SITEMAP_POST_PAGE_SIZE,
      take: SITEMAP_POST_PAGE_SIZE,
    });
  } catch (error) {
    if (isPrismaDatabaseUnavailableError(error)) {
      return [];
    }
    throw error;
  }
}
