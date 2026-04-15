import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock("@/server/queries/policy.queries", () => ({
  getGuestReadLoginRequiredPostTypes: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/server/queries/breed-catalog.queries", () => ({
  listEffectiveBreedCatalogGroupedBySpecies: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/pet-profile", () => ({
  hasBreedLoungeRoute: vi.fn().mockReturnValue(false),
}));

import sitemap from "@/app/sitemap";

const mockPrisma = vi.mocked(prisma) as unknown as {
  post: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("sitemap", () => {
  it("includes public legal surfaces on the first sitemap page", async () => {
    const entries = await sitemap({ id: Promise.resolve(0) });
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain("http://localhost:3000/terms");
    expect(urls).toContain("http://localhost:3000/privacy");
    expect(urls).toContain("http://localhost:3000/commercial");
  });

  it("falls back to static routes when the database is unavailable", async () => {
    mockPrisma.post.findMany.mockRejectedValueOnce(
      new Prisma.PrismaClientInitializationError("db down", "5.22.0"),
    );

    const entries = await sitemap({ id: Promise.resolve(0) });
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain("http://localhost:3000/");
    expect(urls).toContain("http://localhost:3000/feed");
    expect(urls).not.toContain(expect.stringContaining("/posts/"));
  });
});
