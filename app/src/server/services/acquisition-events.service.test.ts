import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { recordAcquisitionEvent } from "@/server/services/acquisition-events.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    acquisitionEventStat: {
      upsert: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  acquisitionEventStat?: {
    upsert: ReturnType<typeof vi.fn>;
  };
};

describe("acquisition events service", () => {
  beforeEach(() => {
    mockPrisma.acquisitionEventStat?.upsert.mockReset();
  });

  it("upserts daily aggregate with normalized optional dimensions", async () => {
    mockPrisma.acquisitionEventStat?.upsert.mockResolvedValue({});

    const result = await recordAcquisitionEvent({
      surface: "GUIDE",
      event: "GUIDE_CTA_CLICKED",
      targetType: "GUIDE",
      targetId: " lost-dog-poster:primary ",
      source: "",
    });

    expect(result).toEqual({ ok: true, recorded: true });
    expect(mockPrisma.acquisitionEventStat?.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.acquisitionEventStat?.upsert.mock.calls[0][0]).toMatchObject({
      create: {
        surface: "GUIDE",
        event: "GUIDE_CTA_CLICKED",
        targetType: "GUIDE",
        targetId: "lost-dog-poster:primary",
        source: "NONE",
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
    });
  });

  it("returns schema sync required when the delegate is unavailable", async () => {
    const original = mockPrisma.acquisitionEventStat;
    delete mockPrisma.acquisitionEventStat;

    const result = await recordAcquisitionEvent({
      surface: "HOME",
      event: "LANDING_VIEWED",
    });

    expect(result).toEqual({ ok: false, reason: "SCHEMA_SYNC_REQUIRED" });

    mockPrisma.acquisitionEventStat = original;
  });

  it("returns schema sync required when the table is missing", async () => {
    mockPrisma.acquisitionEventStat?.upsert.mockRejectedValue(
      new Error("The table `public.AcquisitionEventStat` does not exist"),
    );

    const result = await recordAcquisitionEvent({
      surface: "CAMPAIGN_NEIGHBORHOOD_MAP",
      event: "CAMPAIGN_VIEWED",
      targetType: "CAMPAIGN",
      targetId: "neighborhood_map",
    });

    expect(result).toEqual({ ok: false, reason: "SCHEMA_SYNC_REQUIRED" });
  });
});
