import { describe, expect, it, vi } from "vitest";

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

describe("sitemap", () => {
  it("includes public legal surfaces on the first sitemap page", async () => {
    const entries = await sitemap({ id: Promise.resolve(0) });
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain("http://localhost:3000/terms");
    expect(urls).toContain("http://localhost:3000/privacy");
    expect(urls).toContain("http://localhost:3000/commercial");
  });
});

