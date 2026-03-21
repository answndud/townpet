import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostScope, PostType, Prisma, SearchTermSearchIn } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  getPopularSearchTerms,
  getSearchInsightsOverview,
  listSearchTermSuggestions,
  recordSearchTerm,
} from "@/server/queries/search.queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    searchTermStat: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  searchTermStat?: {
    findMany: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
};

describe("search queries", () => {
  beforeEach(() => {
    mockPrisma.searchTermStat?.findMany.mockReset();
    mockPrisma.searchTermStat?.upsert.mockReset();
  });

  it("returns normalized popular search terms from SearchTermStat", async () => {
    mockPrisma.searchTermStat?.findMany.mockResolvedValue([
      {
        termDisplay: "산책",
        count: 12,
        scope: PostScope.GLOBAL,
        typeKey: "ALL",
        searchIn: SearchTermSearchIn.ALL,
      },
      {
        termDisplay: "  병원 후기 ",
        count: 8,
        scope: PostScope.GLOBAL,
        typeKey: "ALL",
        searchIn: SearchTermSearchIn.ALL,
      },
      {
        termDisplay: "test@example.com",
        scope: PostScope.GLOBAL,
        typeKey: "ALL",
        searchIn: SearchTermSearchIn.ALL,
      },
    ]);

    const terms = await getPopularSearchTerms(5);

    expect(terms).toEqual(["산책", "병원 후기"]);
    expect(mockPrisma.searchTermStat?.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ scope: "GLOBAL", typeKey: "ALL", searchIn: "ALL" }] },
      }),
    );
  });

  it("records aggregate search terms in SearchTermStat", async () => {
    mockPrisma.searchTermStat?.upsert.mockResolvedValue({});

    const result = await recordSearchTerm("산책");

    expect(result).toEqual({ ok: true, recorded: true });
    expect(mockPrisma.searchTermStat?.upsert).toHaveBeenCalledTimes(1);
    const args = mockPrisma.searchTermStat?.upsert.mock.calls[0][0];
    expect(args.where.statKey).toContain("GLOBAL|ALL|ALL|");
    expect(args.update.count).toEqual({ increment: 1 });
    expect(args.create.scope).toBe("GLOBAL");
    expect(args.create.typeKey).toBe("ALL");
    expect(args.create.searchIn).toBe("ALL");
  });

  it("records context-specific and global aggregate rows together", async () => {
    mockPrisma.searchTermStat?.upsert.mockResolvedValue({});

    const result = await recordSearchTerm("건강검진", {
      scope: PostScope.LOCAL,
      type: PostType.HOSPITAL_REVIEW,
      searchIn: "TITLE",
    });

    expect(result).toEqual({ ok: true, recorded: true });
    expect(mockPrisma.searchTermStat?.upsert).toHaveBeenCalledTimes(2);

    const createPayloads = mockPrisma.searchTermStat?.upsert.mock.calls.map(
      ([args]) => args.create,
    );
    expect(createPayloads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          termDisplay: "건강 검진",
          scope: "LOCAL",
          typeKey: "HOSPITAL_REVIEW",
          searchIn: "TITLE",
        }),
        expect.objectContaining({
          termDisplay: "건강 검진",
          scope: "GLOBAL",
          typeKey: "ALL",
          searchIn: "ALL",
        }),
      ]),
    );
  });

  it("records result counts without incrementing query count for result-stage telemetry", async () => {
    mockPrisma.searchTermStat?.upsert.mockResolvedValue({});

    const result = await recordSearchTerm("병원 후기", {
      resultCount: 0,
      incrementQueryCount: false,
      scope: PostScope.GLOBAL,
      type: PostType.HOSPITAL_REVIEW,
      searchIn: "AUTHOR",
    });

    expect(result).toEqual({ ok: true, recorded: true });
    const args = mockPrisma.searchTermStat?.upsert.mock.calls[0][0];
    expect(args.update.count).toBeUndefined();
    expect(args.update.lastResultCount).toBe(0);
    expect(args.update.totalResultCount).toEqual({ increment: 0 });
    expect(args.update.zeroResultCount).toEqual({ increment: 1 });
    expect(args.create.count).toBe(0);
  });

  it("returns schema sync required when SearchTermStat model is unavailable", async () => {
    const original = mockPrisma.searchTermStat;
    delete mockPrisma.searchTermStat;

    const result = await recordSearchTerm("산책");

    expect(result).toEqual({ ok: false, reason: "SCHEMA_SYNC_REQUIRED" });

    mockPrisma.searchTermStat = original;
  });

  it("rejects too short search term", async () => {
    const result = await recordSearchTerm("a");

    expect(result).toEqual({ ok: true, recorded: false, reason: "INVALID_TERM" });
    expect(mockPrisma.searchTermStat?.upsert).not.toHaveBeenCalled();
  });

  it("skips sensitive terms instead of storing them", async () => {
    const result = await recordSearchTerm("010-1234-5678");

    expect(result).toEqual({
      ok: true,
      recorded: false,
      reason: "SENSITIVE_TERM",
    });
    expect(mockPrisma.searchTermStat?.upsert).not.toHaveBeenCalled();
  });

  it("returns schema sync required when table exists in client but DB is missing", async () => {
    mockPrisma.searchTermStat?.upsert.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("missing table", {
        code: "P2021",
        clientVersion: "test",
      }),
    );

    const result = await recordSearchTerm("산책");

    expect(result).toEqual({ ok: false, reason: "SCHEMA_SYNC_REQUIRED" });
  });

  it("returns ranked context-aware search-term suggestions from SearchTermStat", async () => {
    mockPrisma.searchTermStat?.findMany.mockResolvedValue([
      {
        termDisplay: "병원 후기",
        count: 12,
        updatedAt: new Date("2026-03-19T00:00:00.000Z"),
        scope: PostScope.GLOBAL,
        typeKey: "ALL",
        searchIn: SearchTermSearchIn.ALL,
      },
      {
        termDisplay: "병원 후기",
        count: 3,
        updatedAt: new Date("2026-03-20T00:00:00.000Z"),
        scope: PostScope.LOCAL,
        typeKey: "HOSPITAL_REVIEW",
        searchIn: SearchTermSearchIn.TITLE,
      },
      {
        termDisplay: "병원비 절약",
        count: 5,
        updatedAt: new Date("2026-03-18T00:00:00.000Z"),
        scope: PostScope.GLOBAL,
        typeKey: "ALL",
        searchIn: SearchTermSearchIn.ALL,
      },
    ]);

    const terms = await listSearchTermSuggestions("병원후", 5, {
      scope: PostScope.LOCAL,
      type: PostType.HOSPITAL_REVIEW,
      searchIn: "TITLE",
    });

    expect(terms).toEqual(["병원 후기"]);
    expect(mockPrisma.searchTermStat?.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { scope: "LOCAL", typeKey: "HOSPITAL_REVIEW", searchIn: "TITLE" },
                { scope: "GLOBAL", typeKey: "ALL", searchIn: "ALL" },
              ],
            },
            expect.any(Object),
          ],
        },
      }),
    );
  });

  it("matches canonical structured aliases in search-term suggestions", async () => {
    mockPrisma.searchTermStat?.findMany.mockResolvedValue([
      {
        termDisplay: "건강 검진",
        count: 7,
        updatedAt: new Date("2026-03-19T00:00:00.000Z"),
        scope: PostScope.GLOBAL,
        typeKey: "ALL",
        searchIn: SearchTermSearchIn.ALL,
      },
    ]);

    const terms = await listSearchTermSuggestions("건강검진", 5);

    expect(terms).toEqual(["건강 검진"]);
  });

  it("builds popular/zero-result/low-result search insights from aggregate rows only", async () => {
    mockPrisma.searchTermStat?.findMany.mockResolvedValue([
      {
        termDisplay: "산책",
        count: 10,
        zeroResultCount: 0,
        totalResultCount: 80,
        lastResultCount: 9,
        updatedAt: new Date("2026-03-19T00:00:00.000Z"),
      },
      {
        termDisplay: "노령견 케어",
        count: 4,
        zeroResultCount: 2,
        totalResultCount: 3,
        lastResultCount: 0,
        updatedAt: new Date("2026-03-19T01:00:00.000Z"),
      },
      {
        termDisplay: "test@example.com",
        count: 99,
        zeroResultCount: 0,
        totalResultCount: 0,
        lastResultCount: 0,
        updatedAt: new Date("2026-03-19T02:00:00.000Z"),
      },
    ]);

    const overview = await getSearchInsightsOverview(5);

    expect(overview.context).toEqual({
      scope: PostScope.GLOBAL,
      typeKey: "ALL",
      searchIn: SearchTermSearchIn.ALL,
    });
    expect(overview.summary).toEqual({
      trackedTermCount: 2,
      totalQueryCount: 14,
      totalZeroResultCount: 2,
      zeroResultRate: 2 / 14,
    });
    expect(overview.popularTerms[0]).toMatchObject({
      term: "산책",
      count: 10,
      averageResultCount: 8,
    });
    expect(overview.zeroResultTerms[0]).toMatchObject({
      term: "노령견 케어",
      zeroResultCount: 2,
    });
    expect(overview.lowResultTerms[0]).toMatchObject({
      term: "노령견 케어",
      averageResultCount: 0.75,
    });
    expect(overview.popularTerms.some((item) => item.term.includes("@"))).toBe(false);
    expect(mockPrisma.searchTermStat?.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          scope: "GLOBAL",
          typeKey: "ALL",
          searchIn: "ALL",
        },
      }),
    );
  });

  it("builds search insights for an exact ops context without global fallback rows", async () => {
    mockPrisma.searchTermStat?.findMany.mockResolvedValue([
      {
        termDisplay: "건강 검진",
        count: 6,
        zeroResultCount: 3,
        totalResultCount: 5,
        lastResultCount: 0,
        updatedAt: new Date("2026-03-20T00:00:00.000Z"),
      },
    ]);

    const overview = await getSearchInsightsOverview(5, {
      scope: PostScope.LOCAL,
      type: PostType.HOSPITAL_REVIEW,
      searchIn: SearchTermSearchIn.TITLE,
    });

    expect(overview.context).toEqual({
      scope: PostScope.LOCAL,
      typeKey: PostType.HOSPITAL_REVIEW,
      searchIn: SearchTermSearchIn.TITLE,
    });
    expect(overview.summary).toEqual({
      trackedTermCount: 1,
      totalQueryCount: 6,
      totalZeroResultCount: 3,
      zeroResultRate: 0.5,
    });
    expect(mockPrisma.searchTermStat?.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          scope: "LOCAL",
          typeKey: "HOSPITAL_REVIEW",
          searchIn: "TITLE",
        },
      }),
    );
  });
});
