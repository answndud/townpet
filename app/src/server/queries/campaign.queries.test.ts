import { PostStatus, PostType, Prisma } from "@prisma/client";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { prisma } from "@/lib/prisma";
import { getNeighborhoodMapCampaignStats } from "@/server/queries/campaign.queries";

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

describe("campaign queries", () => {
  beforeEach(() => {
    mockPrisma.post.count.mockReset();
    mockPrisma.post.findMany.mockReset();
  });

  it("counts active campaign content by contribution type", async () => {
    mockPrisma.post.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(5);
    mockPrisma.post.findMany.mockResolvedValueOnce([
      { authorId: "user-1" },
      { authorId: "user-2" },
    ]);

    await expect(getNeighborhoodMapCampaignStats()).resolves.toEqual({
      hospitalCount: 3,
      walkRouteCount: 4,
      reportCount: 5,
      contributorCount: 2,
    });
    expect(mockPrisma.post.count).toHaveBeenNthCalledWith(1, {
      where: {
        status: PostStatus.ACTIVE,
        type: PostType.HOSPITAL_REVIEW,
      },
    });
    expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        distinct: ["authorId"],
        select: { authorId: true },
      }),
    );
  });

  it("returns zero status when the database is unavailable", async () => {
    mockPrisma.post.count.mockRejectedValueOnce(
      new Prisma.PrismaClientInitializationError("db down", "5.22.0"),
    );

    await expect(getNeighborhoodMapCampaignStats()).resolves.toEqual({
      hospitalCount: 0,
      walkRouteCount: 0,
      reportCount: 0,
      contributorCount: 0,
    });
  });
});
