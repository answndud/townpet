import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { getWebVitalSummary } from "@/server/queries/web-vitals.queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    webVitalSample: {
      findMany: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  webVitalSample?: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("web vitals summary query", () => {
  beforeEach(() => {
    mockPrisma.webVitalSample = mockPrisma.webVitalSample ?? { findMany: vi.fn() };
    mockPrisma.webVitalSample.findMany.mockReset();
  });

  it("groups samples by metric and route with p75 and p95 values", async () => {
    mockPrisma.webVitalSample?.findMany.mockResolvedValue([
      {
        metric: "LCP",
        value: 100,
        rating: "GOOD",
        route: "/",
        createdAt: new Date("2026-05-30T00:00:00.000Z"),
      },
      {
        metric: "LCP",
        value: 200,
        rating: "GOOD",
        route: "/",
        createdAt: new Date("2026-05-30T00:01:00.000Z"),
      },
      {
        metric: "LCP",
        value: 300,
        rating: "GOOD",
        route: "/",
        createdAt: new Date("2026-05-30T00:02:00.000Z"),
      },
      {
        metric: "LCP",
        value: 400,
        rating: "NEEDS_IMPROVEMENT",
        route: "/",
        createdAt: new Date("2026-05-30T00:03:00.000Z"),
      },
      {
        metric: "TTFB",
        value: 900,
        rating: "NEEDS_IMPROVEMENT",
        route: "/feed/guest",
        createdAt: new Date("2026-05-30T00:04:00.000Z"),
      },
    ]);

    const summary = await getWebVitalSummary({ days: 7, limit: 100 });

    expect(mockPrisma.webVitalSample?.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
        orderBy: { createdAt: "desc" },
      }),
    );
    expect(summary.schemaSyncRequired).toBe(false);
    expect(summary.sampleCount).toBe(5);
    expect(summary.rows[0]).toMatchObject({
      metric: "LCP",
      route: "/",
      count: 4,
      p75: 300,
      p95: 400,
      goodCount: 3,
      needsImprovementCount: 1,
      poorCount: 0,
    });
    expect(summary.rows[1]).toMatchObject({
      metric: "TTFB",
      route: "/feed/guest",
      count: 1,
      p75: 900,
      p95: 900,
    });
  });

  it("returns schema sync required when delegate is unavailable", async () => {
    const original = mockPrisma.webVitalSample;
    delete mockPrisma.webVitalSample;

    const summary = await getWebVitalSummary();

    expect(summary).toMatchObject({
      schemaSyncRequired: true,
      sampleCount: 0,
      rows: [],
    });
    mockPrisma.webVitalSample = original;
  });

  it("returns schema sync required when table is missing", async () => {
    mockPrisma.webVitalSample?.findMany.mockRejectedValue(
      new Error("The table `public.WebVitalSample` does not exist"),
    );

    const summary = await getWebVitalSummary();

    expect(summary.schemaSyncRequired).toBe(true);
    expect(summary.rows).toEqual([]);
  });
});
