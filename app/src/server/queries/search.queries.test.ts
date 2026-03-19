import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

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
      { termDisplay: "산책" },
      { termDisplay: "  병원 후기 " },
      { termDisplay: "test@example.com" },
      { termDisplay: "x" },
    ]);

    const terms = await getPopularSearchTerms(5);

    expect(terms).toEqual(["산책", "병원 후기"]);
  });

  it("records and increments search term in SearchTermStat", async () => {
    mockPrisma.searchTermStat?.upsert.mockResolvedValue({});

    const result = await recordSearchTerm("산책");

    expect(result).toEqual({ ok: true, recorded: true });
    expect(mockPrisma.searchTermStat?.upsert).toHaveBeenCalledTimes(1);
    const args = mockPrisma.searchTermStat?.upsert.mock.calls[0][0];
    expect(args.where.termNormalized).toBe("산책");
    expect(args.update.count).toEqual({ increment: 1 });
  });

  it("records result counts without incrementing query count for result-stage telemetry", async () => {
    mockPrisma.searchTermStat?.upsert.mockResolvedValue({});

    const result = await recordSearchTerm("병원 후기", {
      resultCount: 0,
      incrementQueryCount: false,
    });

    expect(result).toEqual({ ok: true, recorded: true });
    const args = mockPrisma.searchTermStat?.upsert.mock.calls[0][0];
    expect(args.update.count).toBeUndefined();
    expect(args.update.lastResultCount).toBe(0);
    expect(args.update.totalResultCount).toEqual({ increment: 0 });
    expect(args.update.zeroResultCount).toEqual({ increment: 1 });
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

  it("returns ranked search-term suggestions from SearchTermStat", async () => {
    mockPrisma.searchTermStat?.findMany.mockResolvedValue([
      {
        termDisplay: "병원 후기",
        count: 12,
        updatedAt: new Date("2026-03-19T00:00:00.000Z"),
      },
      {
        termDisplay: "병원비 절약",
        count: 5,
        updatedAt: new Date("2026-03-18T00:00:00.000Z"),
      },
      {
        termDisplay: "산책 코스",
        count: 20,
        updatedAt: new Date("2026-03-17T00:00:00.000Z"),
      },
    ]);

    const terms = await listSearchTermSuggestions("병원후", 5);

    expect(terms).toEqual(["병원 후기"]);
  });

  it("builds popular/zero-result/low-result search insights", async () => {
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
  });
});
