import { describe, expect, it, vi } from "vitest";

import { listPublicSitemapPosts } from "@/server/queries/sitemap.queries";

vi.mock("@/server/queries/sitemap.queries", () => ({
  countPublicSitemapPosts: vi.fn().mockResolvedValue(0),
  listPublicSitemapPosts: vi.fn().mockResolvedValue([]),
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

const mockListPublicSitemapPosts = vi.mocked(listPublicSitemapPosts);

describe("sitemap", () => {
  it("includes public legal surfaces on the first sitemap page", async () => {
    const entries = await sitemap({ id: Promise.resolve(0) });
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain("http://localhost:3000/");
    expect(urls).toContain("http://localhost:3000/feed");
    expect(urls).toContain("http://localhost:3000/search");
    expect(urls).toContain("http://localhost:3000/boards/adoption");
    expect(urls).toContain("http://localhost:3000/campaigns/neighborhood-map");
    expect(urls).toContain("http://localhost:3000/guides/lost-dog-poster");
    expect(urls).toContain("http://localhost:3000/guides/24h-vet-checklist");
    expect(urls).toContain("http://localhost:3000/guides/pet-used-trade-safety");
    expect(urls).toContain("http://localhost:3000/guides/lost-pet-first-24-hours");
    expect(urls).toContain("http://localhost:3000/guides/pet-hospital-review-policy");
    expect(urls).toContain("http://localhost:3000/terms");
    expect(urls).toContain("http://localhost:3000/privacy");
    expect(urls).toContain("http://localhost:3000/commercial");
    expect(urls.some((url) => url.includes("/towns/old-town"))).toBe(false);
  });

  it("does not publish redirect aliases or private user surfaces", async () => {
    const entries = await sitemap({ id: Promise.resolve(0) });
    const urls = entries.map((entry) => entry.url);

    expect(urls).not.toContain("http://localhost:3000/best");
    expect(urls).not.toContain("http://localhost:3000/feed/guest");
    expect(urls).not.toContain("http://localhost:3000/search/guest");
    expect(urls).not.toContain("http://localhost:3000/login");
    expect(urls).not.toContain("http://localhost:3000/register");
    expect(urls).not.toContain("http://localhost:3000/profile");
    expect(urls).not.toContain("http://localhost:3000/notifications");
    expect(urls).not.toContain("http://localhost:3000/admin");
    expect(urls.some((url) => url.includes("/api/"))).toBe(false);
  });

  it("falls back to static routes when the database is unavailable", async () => {
    mockListPublicSitemapPosts.mockResolvedValueOnce([]);

    const entries = await sitemap({ id: Promise.resolve(0) });
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain("http://localhost:3000/");
    expect(urls).toContain("http://localhost:3000/feed");
    expect(urls).not.toContain(expect.stringContaining("/posts/"));
  });
});
