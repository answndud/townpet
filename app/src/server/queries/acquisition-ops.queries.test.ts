import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { getCorrectionFlowOpsOverview } from "@/server/queries/acquisition-ops.queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    acquisitionEventStat: {
      findMany: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  acquisitionEventStat?: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("acquisition ops queries", () => {
  beforeEach(() => {
    mockPrisma.acquisitionEventStat?.findMany.mockReset();
  });

  it("summarizes correction flow view, submit, receipt CTA, and source counts", async () => {
    const now = new Date("2026-05-27T00:00:00.000Z");
    mockPrisma.acquisitionEventStat?.findMany.mockResolvedValue([
      {
        id: "event-1",
        day: now,
        surface: "CORRECTION_FLOW",
        event: "CORRECTION_FLOW_VIEWED",
        targetType: "POST",
        targetId: "post-1",
        source: "operator_content",
        count: 10,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "event-2",
        day: now,
        surface: "CORRECTION_FLOW",
        event: "CORRECTION_REQUEST_SUBMITTED",
        targetType: "POST",
        targetId: "post-1",
        source: "linked_post",
        count: 4,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "event-3",
        day: now,
        surface: "CORRECTION_FLOW",
        event: "CORRECTION_RECEIPT_CTA_CLICKED",
        targetType: "CTA",
        targetId: "feed_after_correction",
        source: "receipt",
        count: 2,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const overview = await getCorrectionFlowOpsOverview(7);

    expect(mockPrisma.acquisitionEventStat?.findMany).toHaveBeenCalledWith({
      where: {
        day: { gte: expect.any(Date) },
        surface: "CORRECTION_FLOW",
        event: {
          in: [
            "CORRECTION_FLOW_VIEWED",
            "CORRECTION_REQUEST_SUBMITTED",
            "CORRECTION_RECEIPT_CTA_CLICKED",
          ],
        },
      },
      orderBy: [{ event: "asc" }, { count: "desc" }],
    });
    expect(overview).toMatchObject({
      days: 7,
      schemaSyncRequired: false,
      viewCount: 10,
      submittedCount: 4,
      receiptCtaClickCount: 2,
      submitRate: 0.4,
      receiptCtaRate: 0.5,
    });
    expect(overview.sourceSummaries[0]).toEqual({
      source: "operator_content",
      count: 10,
    });
  });

  it("degrades to zero metrics when the acquisition schema is unavailable", async () => {
    const original = mockPrisma.acquisitionEventStat;
    delete mockPrisma.acquisitionEventStat;

    await expect(getCorrectionFlowOpsOverview(7)).resolves.toMatchObject({
      schemaSyncRequired: true,
      viewCount: 0,
      submittedCount: 0,
      submitRate: 0,
    });

    mockPrisma.acquisitionEventStat = original;
  });

  it("degrades to zero metrics when the acquisition table is missing", async () => {
    mockPrisma.acquisitionEventStat?.findMany.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        "The table `public.AcquisitionEventStat` does not exist",
        {
          code: "P2021",
          clientVersion: "5.22.0",
          meta: { table: "AcquisitionEventStat" },
        },
      ),
    );

    await expect(getCorrectionFlowOpsOverview(7)).resolves.toMatchObject({
      schemaSyncRequired: true,
      viewCount: 0,
      submittedCount: 0,
    });
  });
});
