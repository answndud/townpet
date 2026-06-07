import { Prisma, type AcquisitionEventStat } from "@prisma/client";

import { ACQUISITION_EVENT_LABELS } from "@/lib/acquisition-events";
import { prisma } from "@/lib/prisma";

const DEFAULT_DAYS = 7;
const CORRECTION_FLOW_SURFACE = "CORRECTION_FLOW";
const LOST_FOUND_ACQUISITION_SURFACES = ["LOST_FLOW", "SHARE_PANEL"] as const;
const LOST_FOUND_ACQUISITION_EVENTS = [
  "LOST_FLOW_VIEWED",
  "LOST_FLOW_CTA_CLICKED",
  "LOST_SHARE_PANEL_OPENED",
  "LOST_SHARE_ACTION_CLICKED",
  "LOST_SIGHTING_MODE_SELECTED",
  "LOST_SIGHTING_SUBMIT_ATTEMPTED",
  "LOST_SIGHTING_CREATED",
] as const;

const LOST_FOUND_FUNNEL_STAGES = [
  {
    event: "LOST_FLOW_VIEWED",
    label: "랜딩 조회",
    description: "/lost-found 공개 제보 페이지 조회",
  },
  {
    event: "LOST_FLOW_CTA_CLICKED",
    label: "CTA 클릭",
    description: "등록, 전체 제보, 가이드 진입 클릭",
  },
  {
    event: "LOST_SHARE_PANEL_OPENED",
    label: "공유 도구 열기",
    description: "상세의 공유 도구 lazy panel 진입",
  },
  {
    event: "LOST_SHARE_ACTION_CLICKED",
    label: "공유 액션",
    description: "링크, 카카오 문구, 전단 이미지 진입",
  },
  {
    event: "LOST_SIGHTING_MODE_SELECTED",
    label: "목격 모드 선택",
    description: "댓글 폼에서 목격 제보 모드 선택",
  },
  {
    event: "LOST_SIGHTING_SUBMIT_ATTEMPTED",
    label: "목격 제출 시도",
    description: "목격 댓글 제출 버튼 실행",
  },
  {
    event: "LOST_SIGHTING_CREATED",
    label: "목격 댓글 생성",
    description: "목격 제보 댓글 작성 성공",
  },
] as const;

export type CorrectionFlowOpsOverview = {
  days: number;
  schemaSyncRequired: boolean;
  viewCount: number;
  submittedCount: number;
  receiptCtaClickCount: number;
  submitRate: number;
  receiptCtaRate: number;
  dailySummaries: Array<{
    day: string;
    viewCount: number;
    submittedCount: number;
    receiptCtaClickCount: number;
    submitRate: number;
    receiptCtaRate: number;
  }>;
  eventCounts: Array<{
    event: string;
    count: number;
  }>;
  sourceSummaries: Array<{
    source: string;
    count: number;
  }>;
};

export type LostFoundAcquisitionOpsOverview = {
  days: number;
  schemaSyncRequired: boolean;
  landingViewCount: number;
  ctaClickCount: number;
  sharePanelOpenCount: number;
  shareActionClickCount: number;
  sightingModeSelectedCount: number;
  sightingSubmitAttemptedCount: number;
  sightingCreatedCount: number;
  ctaRate: number;
  sharePanelOpenRate: number;
  shareActionRate: number;
  sightingSubmitRate: number;
  sightingCreatedRate: number;
  stageSummaries: Array<{
    event: string;
    label: string;
    description: string;
    count: number;
    conversionRate: number;
  }>;
  sourceSummaries: Array<{
    source: string;
    count: number;
  }>;
  eventCounts: Array<{
    event: string;
    label: string;
    count: number;
  }>;
};

function getStartDay(days: number) {
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  day.setUTCDate(day.getUTCDate() - (days - 1));
  return day;
}

function getAcquisitionEventStatDelegate() {
  return (
    prisma as typeof prisma & {
      acquisitionEventStat?: {
        findMany: (typeof prisma.acquisitionEventStat)["findMany"];
      };
    }
  ).acquisitionEventStat;
}

function isMissingAcquisitionEventSchemaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code !== "P2021" && error.code !== "P2022") {
      return false;
    }

    const tableName = String(error.meta?.table ?? "");
    const columnName = String(error.meta?.column ?? "");
    return (
      tableName.includes("AcquisitionEventStat") ||
      columnName.includes("AcquisitionEventStat")
    );
  }

  return (
    error instanceof Error &&
    error.message.includes("AcquisitionEventStat") &&
    (error.message.includes("does not exist") ||
      error.message.includes("Unknown field") ||
      error.message.includes("Unknown arg"))
  );
}

function calculateRate(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

function emptyCorrectionFlowOpsOverview(
  days: number,
  schemaSyncRequired = false,
): CorrectionFlowOpsOverview {
  return {
    days,
    schemaSyncRequired,
    viewCount: 0,
    submittedCount: 0,
    receiptCtaClickCount: 0,
    submitRate: 0,
    receiptCtaRate: 0,
    dailySummaries: [],
    eventCounts: [],
    sourceSummaries: [],
  };
}

function emptyLostFoundAcquisitionOpsOverview(
  days: number,
  schemaSyncRequired = false,
): LostFoundAcquisitionOpsOverview {
  return {
    days,
    schemaSyncRequired,
    landingViewCount: 0,
    ctaClickCount: 0,
    sharePanelOpenCount: 0,
    shareActionClickCount: 0,
    sightingModeSelectedCount: 0,
    sightingSubmitAttemptedCount: 0,
    sightingCreatedCount: 0,
    ctaRate: 0,
    sharePanelOpenRate: 0,
    shareActionRate: 0,
    sightingSubmitRate: 0,
    sightingCreatedRate: 0,
    stageSummaries: LOST_FOUND_FUNNEL_STAGES.map((stage) => ({
      ...stage,
      count: 0,
      conversionRate: 0,
    })),
    sourceSummaries: [],
    eventCounts: [],
  };
}

function formatDayKey(day: Date) {
  return day.toISOString().slice(0, 10);
}

function buildEmptyDailySummary(day: string) {
  return {
    day,
    viewCount: 0,
    submittedCount: 0,
    receiptCtaClickCount: 0,
    submitRate: 0,
    receiptCtaRate: 0,
  };
}

function summarizeCorrectionFlowRows(
  rows: AcquisitionEventStat[],
  days: number,
): CorrectionFlowOpsOverview {
  const eventMap = new Map<string, number>();
  const sourceMap = new Map<string, number>();
  const dailyMap = new Map<string, ReturnType<typeof buildEmptyDailySummary>>();

  for (const row of rows) {
    eventMap.set(row.event, (eventMap.get(row.event) ?? 0) + row.count);
    sourceMap.set(row.source, (sourceMap.get(row.source) ?? 0) + row.count);

    const dayKey = formatDayKey(row.day);
    const dailySummary = dailyMap.get(dayKey) ?? buildEmptyDailySummary(dayKey);
    if (row.event === "CORRECTION_FLOW_VIEWED") {
      dailySummary.viewCount += row.count;
    }
    if (row.event === "CORRECTION_REQUEST_SUBMITTED") {
      dailySummary.submittedCount += row.count;
    }
    if (row.event === "CORRECTION_RECEIPT_CTA_CLICKED") {
      dailySummary.receiptCtaClickCount += row.count;
    }
    dailyMap.set(dayKey, dailySummary);
  }

  const viewCount = eventMap.get("CORRECTION_FLOW_VIEWED") ?? 0;
  const submittedCount = eventMap.get("CORRECTION_REQUEST_SUBMITTED") ?? 0;
  const receiptCtaClickCount = eventMap.get("CORRECTION_RECEIPT_CTA_CLICKED") ?? 0;
  const dailySummaries = Array.from(dailyMap.values())
    .map((summary) => ({
      ...summary,
      submitRate: calculateRate(summary.submittedCount, summary.viewCount),
      receiptCtaRate: calculateRate(summary.receiptCtaClickCount, summary.submittedCount),
    }))
    .sort((left, right) => right.day.localeCompare(left.day));

  return {
    days,
    schemaSyncRequired: false,
    viewCount,
    submittedCount,
    receiptCtaClickCount,
    submitRate: calculateRate(submittedCount, viewCount),
    receiptCtaRate: calculateRate(receiptCtaClickCount, submittedCount),
    dailySummaries,
    eventCounts: Array.from(eventMap.entries())
      .map(([event, count]) => ({ event, count }))
      .sort((left, right) => right.count - left.count),
    sourceSummaries: Array.from(sourceMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 6),
  };
}

function summarizeLostFoundAcquisitionRows(
  rows: AcquisitionEventStat[],
  days: number,
): LostFoundAcquisitionOpsOverview {
  const eventMap = new Map<string, number>();
  const sourceMap = new Map<string, number>();

  for (const row of rows) {
    eventMap.set(row.event, (eventMap.get(row.event) ?? 0) + row.count);
    sourceMap.set(row.source, (sourceMap.get(row.source) ?? 0) + row.count);
  }

  const landingViewCount = eventMap.get("LOST_FLOW_VIEWED") ?? 0;
  const ctaClickCount = eventMap.get("LOST_FLOW_CTA_CLICKED") ?? 0;
  const sharePanelOpenCount = eventMap.get("LOST_SHARE_PANEL_OPENED") ?? 0;
  const shareActionClickCount = eventMap.get("LOST_SHARE_ACTION_CLICKED") ?? 0;
  const sightingModeSelectedCount = eventMap.get("LOST_SIGHTING_MODE_SELECTED") ?? 0;
  const sightingSubmitAttemptedCount =
    eventMap.get("LOST_SIGHTING_SUBMIT_ATTEMPTED") ?? 0;
  const sightingCreatedCount = eventMap.get("LOST_SIGHTING_CREATED") ?? 0;
  const stageCounts = LOST_FOUND_FUNNEL_STAGES.map((stage) => ({
    ...stage,
    count: eventMap.get(stage.event) ?? 0,
  }));
  const stageSummaries = stageCounts.map((stage, index) => {
    const previousCount = index === 0 ? stage.count : stageCounts[index - 1]?.count ?? 0;
    return {
      ...stage,
      conversionRate: index === 0 ? 1 : calculateRate(stage.count, previousCount),
    };
  });

  return {
    days,
    schemaSyncRequired: false,
    landingViewCount,
    ctaClickCount,
    sharePanelOpenCount,
    shareActionClickCount,
    sightingModeSelectedCount,
    sightingSubmitAttemptedCount,
    sightingCreatedCount,
    ctaRate: calculateRate(ctaClickCount, landingViewCount),
    sharePanelOpenRate: calculateRate(sharePanelOpenCount, ctaClickCount),
    shareActionRate: calculateRate(shareActionClickCount, sharePanelOpenCount),
    sightingSubmitRate: calculateRate(
      sightingSubmitAttemptedCount,
      sightingModeSelectedCount,
    ),
    sightingCreatedRate: calculateRate(sightingCreatedCount, sightingSubmitAttemptedCount),
    stageSummaries,
    sourceSummaries: Array.from(sourceMap.entries())
      .filter(([source]) => source !== "NONE")
      .map(([source, count]) => ({ source, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 6),
    eventCounts: Array.from(eventMap.entries())
      .map(([event, count]) => ({
        event,
        label:
          ACQUISITION_EVENT_LABELS[event as keyof typeof ACQUISITION_EVENT_LABELS] ??
          event,
        count,
      }))
      .sort((left, right) => right.count - left.count),
  };
}

export async function getCorrectionFlowOpsOverview(
  days = DEFAULT_DAYS,
): Promise<CorrectionFlowOpsOverview> {
  const delegate = getAcquisitionEventStatDelegate();
  if (!delegate) {
    return emptyCorrectionFlowOpsOverview(days, true);
  }

  try {
    const rows = await delegate.findMany({
      where: {
        day: { gte: getStartDay(days) },
        surface: CORRECTION_FLOW_SURFACE,
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

    return summarizeCorrectionFlowRows(rows, days);
  } catch (error) {
    if (isMissingAcquisitionEventSchemaError(error)) {
      return emptyCorrectionFlowOpsOverview(days, true);
    }
    throw error;
  }
}

export async function getLostFoundAcquisitionOpsOverview(
  days = DEFAULT_DAYS,
): Promise<LostFoundAcquisitionOpsOverview> {
  const delegate = getAcquisitionEventStatDelegate();
  if (!delegate) {
    return emptyLostFoundAcquisitionOpsOverview(days, true);
  }

  try {
    const rows = await delegate.findMany({
      where: {
        day: { gte: getStartDay(days) },
        surface: { in: [...LOST_FOUND_ACQUISITION_SURFACES] },
        event: { in: [...LOST_FOUND_ACQUISITION_EVENTS] },
      },
      orderBy: [{ event: "asc" }, { count: "desc" }],
    });

    return summarizeLostFoundAcquisitionRows(rows, days);
  } catch (error) {
    if (isMissingAcquisitionEventSchemaError(error)) {
      return emptyLostFoundAcquisitionOpsOverview(days, true);
    }
    throw error;
  }
}
