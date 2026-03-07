import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { recordFeedPersonalizationMetric } from "@/server/services/feed-personalization-metrics.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    feedPersonalizationStat: {
      upsert: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  feedPersonalizationStat?: {
    upsert: ReturnType<typeof vi.fn>;
  };
};

describe("feed personalization metrics service", () => {
  beforeEach(() => {
    mockPrisma.feedPersonalizationStat?.upsert.mockReset();
  });

  it("upserts daily aggregate with normalized dimensions", async () => {
    mockPrisma.feedPersonalizationStat?.upsert.mockResolvedValue({});

    const result = await recordFeedPersonalizationMetric({
      surface: "FEED",
      event: "POST_CLICK",
      audienceKey: " maltese ",
      breedCode: "",
      audienceSource: "SEGMENT",
    });

    expect(result).toEqual({ ok: true, recorded: true });
    expect(mockPrisma.feedPersonalizationStat?.upsert).toHaveBeenCalledTimes(1);
    expect(
      mockPrisma.feedPersonalizationStat?.upsert.mock.calls[0][0],
    ).toMatchObject({
      create: {
        surface: "FEED",
        event: "POST_CLICK",
        audienceKey: "MALTESE",
        breedCode: "NONE",
        audienceSource: "SEGMENT",
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
    });
  });

  it("returns schema sync required when delegate is unavailable", async () => {
    const original = mockPrisma.feedPersonalizationStat;
    delete mockPrisma.feedPersonalizationStat;

    const result = await recordFeedPersonalizationMetric({
      surface: "FEED",
      event: "VIEW",
      audienceSource: "NONE",
    });

    expect(result).toEqual({ ok: false, reason: "SCHEMA_SYNC_REQUIRED" });

    mockPrisma.feedPersonalizationStat = original;
  });

  it("returns schema sync required when table is missing", async () => {
    mockPrisma.feedPersonalizationStat?.upsert.mockRejectedValue(
      new Error("The table `public.FeedPersonalizationStat` does not exist"),
    );

    const result = await recordFeedPersonalizationMetric({
      surface: "BREED_LOUNGE",
      event: "VIEW",
      audienceSource: "PET",
    });

    expect(result).toEqual({ ok: false, reason: "SCHEMA_SYNC_REQUIRED" });
  });
});
