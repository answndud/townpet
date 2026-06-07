import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  getCorrectionFlowOpsOverview,
  getLostFoundAcquisitionOpsOverview,
} from "@/server/queries/acquisition-ops.queries";

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
    const previousDay = new Date("2026-05-26T00:00:00.000Z");
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
      {
        id: "event-4",
        day: previousDay,
        surface: "CORRECTION_FLOW",
        event: "CORRECTION_FLOW_VIEWED",
        targetType: "POST",
        targetId: "post-2",
        source: "operator_content",
        count: 5,
        createdAt: previousDay,
        updatedAt: previousDay,
      },
      {
        id: "event-5",
        day: previousDay,
        surface: "CORRECTION_FLOW",
        event: "CORRECTION_REQUEST_SUBMITTED",
        targetType: "POST",
        targetId: "post-2",
        source: "linked_post",
        count: 1,
        createdAt: previousDay,
        updatedAt: previousDay,
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
      viewCount: 15,
      submittedCount: 5,
      receiptCtaClickCount: 2,
      submitRate: 1 / 3,
      receiptCtaRate: 0.4,
    });
    expect(overview.dailySummaries).toEqual([
      {
        day: "2026-05-27",
        viewCount: 10,
        submittedCount: 4,
        receiptCtaClickCount: 2,
        submitRate: 0.4,
        receiptCtaRate: 0.5,
      },
      {
        day: "2026-05-26",
        viewCount: 5,
        submittedCount: 1,
        receiptCtaClickCount: 0,
        submitRate: 0.2,
        receiptCtaRate: 0,
      },
    ]);
    expect(overview.sourceSummaries[0]).toEqual({
      source: "operator_content",
      count: 15,
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

  it("summarizes lost-found acquisition funnel stages and source counts", async () => {
    const now = new Date("2026-06-07T00:00:00.000Z");
    mockPrisma.acquisitionEventStat?.findMany.mockResolvedValue([
      {
        id: "lost-event-1",
        day: now,
        surface: "LOST_FLOW",
        event: "LOST_FLOW_VIEWED",
        targetType: "POST_TYPE",
        targetId: "LOST_FOUND",
        source: "NONE",
        count: 20,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "lost-event-2",
        day: now,
        surface: "LOST_FLOW",
        event: "LOST_FLOW_CTA_CLICKED",
        targetType: "CTA",
        targetId: "lost_found_create",
        source: "hero",
        count: 8,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "lost-event-3",
        day: now,
        surface: "SHARE_PANEL",
        event: "LOST_SHARE_PANEL_OPENED",
        targetType: "POST",
        targetId: "post-1",
        source: "panel_open",
        count: 5,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "lost-event-4",
        day: now,
        surface: "SHARE_PANEL",
        event: "LOST_SHARE_ACTION_CLICKED",
        targetType: "POST",
        targetId: "post-1",
        source: "KAKAO_TEXT_COPY",
        count: 3,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "lost-event-5",
        day: now,
        surface: "LOST_FLOW",
        event: "LOST_SIGHTING_MODE_SELECTED",
        targetType: "POST",
        targetId: "post-1",
        source: "root_form",
        count: 4,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "lost-event-6",
        day: now,
        surface: "LOST_FLOW",
        event: "LOST_SIGHTING_SUBMIT_ATTEMPTED",
        targetType: "POST",
        targetId: "post-1",
        source: "root_form",
        count: 2,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "lost-event-7",
        day: now,
        surface: "LOST_FLOW",
        event: "LOST_SIGHTING_CREATED",
        targetType: "POST",
        targetId: "post-1",
        source: "root_form",
        count: 1,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const overview = await getLostFoundAcquisitionOpsOverview(7);

    expect(mockPrisma.acquisitionEventStat?.findMany).toHaveBeenCalledWith({
      where: {
        day: { gte: expect.any(Date) },
        surface: { in: ["LOST_FLOW", "SHARE_PANEL"] },
        event: {
          in: [
            "LOST_FLOW_VIEWED",
            "LOST_FLOW_CTA_CLICKED",
            "LOST_SHARE_PANEL_OPENED",
            "LOST_SHARE_ACTION_CLICKED",
            "LOST_SIGHTING_MODE_SELECTED",
            "LOST_SIGHTING_SUBMIT_ATTEMPTED",
            "LOST_SIGHTING_CREATED",
          ],
        },
      },
      orderBy: [{ event: "asc" }, { count: "desc" }],
    });
    expect(overview).toMatchObject({
      days: 7,
      schemaSyncRequired: false,
      landingViewCount: 20,
      ctaClickCount: 8,
      sharePanelOpenCount: 5,
      shareActionClickCount: 3,
      sightingModeSelectedCount: 4,
      sightingSubmitAttemptedCount: 2,
      sightingCreatedCount: 1,
      ctaRate: 0.4,
      sharePanelOpenRate: 0.625,
      shareActionRate: 0.6,
      sightingSubmitRate: 0.5,
      sightingCreatedRate: 0.5,
    });
    expect(overview.stageSummaries.map((stage) => stage.label)).toEqual([
      "랜딩 조회",
      "CTA 클릭",
      "공유 도구 열기",
      "공유 액션",
      "목격 모드 선택",
      "목격 제출 시도",
      "목격 댓글 생성",
    ]);
    expect(overview.stageSummaries[1]).toMatchObject({
      event: "LOST_FLOW_CTA_CLICKED",
      count: 8,
      conversionRate: 0.4,
    });
    expect(overview.sourceSummaries[0]).toEqual({
      source: "hero",
      count: 8,
    });
    expect(overview.sourceSummaries).toContainEqual({
      source: "root_form",
      count: 7,
    });
  });

  it("degrades lost-found funnel to zero metrics when the acquisition schema is unavailable", async () => {
    const original = mockPrisma.acquisitionEventStat;
    delete mockPrisma.acquisitionEventStat;

    await expect(getLostFoundAcquisitionOpsOverview(7)).resolves.toMatchObject({
      schemaSyncRequired: true,
      landingViewCount: 0,
      ctaRate: 0,
      stageSummaries: expect.arrayContaining([
        expect.objectContaining({ event: "LOST_FLOW_VIEWED", count: 0 }),
      ]),
    });

    mockPrisma.acquisitionEventStat = original;
  });
});
