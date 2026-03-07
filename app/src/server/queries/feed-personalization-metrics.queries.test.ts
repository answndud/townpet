import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { getFeedPersonalizationOverview } from "@/server/queries/feed-personalization-metrics.queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    feedPersonalizationStat: {
      findMany: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  feedPersonalizationStat: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("feed personalization metric queries", () => {
  beforeEach(() => {
    mockPrisma.feedPersonalizationStat.findMany.mockReset();
  });

  it("aggregates CTR and top audience summaries from daily metric rows", async () => {
    mockPrisma.feedPersonalizationStat.findMany.mockResolvedValue([
      {
        day: new Date("2026-03-06T00:00:00.000Z"),
        surface: "FEED",
        event: "VIEW",
        audienceKey: "MALTESE",
        breedCode: "MALTESE",
        audienceSource: "SEGMENT",
        count: 10,
      },
      {
        day: new Date("2026-03-06T00:00:00.000Z"),
        surface: "FEED",
        event: "POST_CLICK",
        audienceKey: "MALTESE",
        breedCode: "MALTESE",
        audienceSource: "SEGMENT",
        count: 4,
      },
      {
        day: new Date("2026-03-06T00:00:00.000Z"),
        surface: "FEED",
        event: "AD_IMPRESSION",
        audienceKey: "MALTESE",
        breedCode: "MALTESE",
        audienceSource: "SEGMENT",
        count: 5,
      },
      {
        day: new Date("2026-03-06T00:00:00.000Z"),
        surface: "FEED",
        event: "AD_CLICK",
        audienceKey: "MALTESE",
        breedCode: "MALTESE",
        audienceSource: "SEGMENT",
        count: 2,
      },
      {
        day: new Date("2026-03-07T00:00:00.000Z"),
        surface: "BREED_LOUNGE",
        event: "VIEW",
        audienceKey: "DOG",
        breedCode: "NONE",
        audienceSource: "PET",
        count: 8,
      },
      {
        day: new Date("2026-03-07T00:00:00.000Z"),
        surface: "BREED_LOUNGE",
        event: "POST_CLICK",
        audienceKey: "DOG",
        breedCode: "NONE",
        audienceSource: "PET",
        count: 1,
      },
    ]);

    const overview = await getFeedPersonalizationOverview(7);

    expect(overview.totals.viewCount).toBe(18);
    expect(overview.totals.postClickCount).toBe(5);
    expect(overview.totals.postCtr).toBeCloseTo(5 / 18, 5);
    expect(overview.totals.adCtr).toBeCloseTo(2 / 5, 5);

    expect(overview.surfaceSummaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          surface: "FEED",
          viewCount: 10,
          postClickCount: 4,
          adImpressionCount: 5,
          adClickCount: 2,
        }),
        expect.objectContaining({
          surface: "BREED_LOUNGE",
          viewCount: 8,
          postClickCount: 1,
        }),
      ]),
    );

    expect(overview.sourceSummaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "SEGMENT",
          viewCount: 10,
          postClickCount: 4,
          adImpressionCount: 5,
          adClickCount: 2,
        }),
        expect.objectContaining({
          source: "PET",
          viewCount: 8,
          postClickCount: 1,
        }),
      ]),
    );

    expect(overview.topAudienceSummaries[0]).toMatchObject({
      audienceKey: "MALTESE",
      breedCode: "MALTESE",
      viewCount: 10,
      postClickCount: 4,
      adImpressionCount: 5,
      adClickCount: 2,
    });
  });
});
