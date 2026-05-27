import { Prisma, type AcquisitionEventStat } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const DEFAULT_DAYS = 7;
const CORRECTION_FLOW_SURFACE = "CORRECTION_FLOW";

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
