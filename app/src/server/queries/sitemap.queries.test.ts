import { Prisma, PostScope, PostStatus, PostType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { countPublicSitemapPosts, listPublicSitemapPosts } from "@/server/queries/sitemap.queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  post: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

const where = {
  status: PostStatus.ACTIVE,
  scope: PostScope.GLOBAL,
  type: { notIn: [PostType.HOSPITAL_REVIEW] },
};

describe("sitemap queries", () => {
  beforeEach(() => {
    mockPrisma.post.count.mockReset();
    mockPrisma.post.findMany.mockReset();
  });

  it("lists public post metadata with a bounded page", async () => {
    mockPrisma.post.count.mockResolvedValue(3);
    mockPrisma.post.findMany.mockResolvedValue([]);

    await expect(countPublicSitemapPosts(where)).resolves.toBe(3);
    await expect(listPublicSitemapPosts({ where, page: 2 })).resolves.toEqual([]);
    expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10_000, take: 5_000 }),
    );
  });

  it("fails soft for database initialization failures", async () => {
    const error = new Prisma.PrismaClientInitializationError("db down", "5.22.0");
    mockPrisma.post.count.mockRejectedValue(error);
    mockPrisma.post.findMany.mockRejectedValue(error);

    await expect(countPublicSitemapPosts(where)).resolves.toBe(0);
    await expect(listPublicSitemapPosts({ where, page: 0 })).resolves.toEqual([]);
  });
});
