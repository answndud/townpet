import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getTownLandingByNeighborhoodSlug } from "@/server/queries/neighborhood.queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    neighborhood: {
      findMany: vi.fn(),
    },
    post: {
      count: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  neighborhood: {
    findMany: ReturnType<typeof vi.fn>;
  };
  post: {
    count: ReturnType<typeof vi.fn>;
  };
};

describe("neighborhood town landing queries", () => {
  beforeEach(() => {
    mockPrisma.neighborhood.findMany.mockReset();
    mockPrisma.post.count.mockReset();
  });

  it("builds a dynamic town landing from a selected neighborhood region", async () => {
    mockPrisma.neighborhood.findMany.mockResolvedValue([{ id: "hood-1" }, { id: "hood-2" }]);
    mockPrisma.post.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(3);

    const town = await getTownLandingByNeighborhoodSlug("서울특별시--강남구");

    expect(mockPrisma.neighborhood.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          city: { in: expect.arrayContaining(["서울특별시"]) },
          district: "강남구",
        },
      }),
    );
    expect(mockPrisma.post.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          neighborhoodId: { in: ["hood-1", "hood-2"] },
          type: PostType.HOSPITAL_REVIEW,
        }),
      }),
    );
    expect(town?.headline).toBe("강남구 반려생활 허브");
    expect(town?.sections.map((section) => section.count)).toEqual([2, 1, 0, 3]);
  });

  it("returns null for invalid or unknown town slugs", async () => {
    await expect(getTownLandingByNeighborhoodSlug("bad-slug")).resolves.toBeNull();

    mockPrisma.neighborhood.findMany.mockResolvedValue([]);
    await expect(getTownLandingByNeighborhoodSlug("서울특별시--강남구")).resolves.toBeNull();
  });
});
