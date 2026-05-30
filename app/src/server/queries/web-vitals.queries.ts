import { Prisma, type WebVitalMetric, type WebVitalRating } from "@prisma/client";

import { WEB_VITAL_METRICS } from "@/lib/web-vitals";
import { prisma } from "@/lib/prisma";

const DEFAULT_DAYS = 7;
const DEFAULT_LIMIT = 5000;

type WebVitalSampleRow = {
  metric: WebVitalMetric;
  value: number;
  rating: WebVitalRating;
  route: string;
  createdAt: Date;
};

export type WebVitalSummaryRow = {
  metric: WebVitalMetric;
  route: string;
  count: number;
  p75: number;
  p95: number;
  goodCount: number;
  needsImprovementCount: number;
  poorCount: number;
  latestAt: Date | null;
};

export type WebVitalSummary = {
  days: number;
  limit: number;
  schemaSyncRequired: boolean;
  sampleCount: number;
  rows: WebVitalSummaryRow[];
};

type WebVitalSummaryOptions = {
  days?: number;
  limit?: number;
};

function clampInteger(value: number | undefined, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function getSinceDate(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function getWebVitalSampleDelegate() {
  return (
    prisma as typeof prisma & {
      webVitalSample?: {
        findMany: (typeof prisma.webVitalSample)["findMany"];
      };
    }
  ).webVitalSample;
}

function isMissingWebVitalSchemaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code !== "P2021" && error.code !== "P2022") {
      return false;
    }

    const tableName = String(error.meta?.table ?? "");
    const columnName = String(error.meta?.column ?? "");
    return tableName.includes("WebVitalSample") || columnName.includes("WebVitalSample");
  }

  return (
    error instanceof Error &&
    error.message.includes("WebVitalSample") &&
    (error.message.includes("does not exist") ||
      error.message.includes("Unknown field") ||
      error.message.includes("Unknown arg"))
  );
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.min(sorted.length - 1, Math.max(0, index))] ?? 0;
}

function summarizeRows(rows: WebVitalSampleRow[], days: number, limit: number): WebVitalSummary {
  const groups = new Map<string, WebVitalSampleRow[]>();

  for (const row of rows) {
    const key = `${row.metric}\u0000${row.route}`;
    const current = groups.get(key) ?? [];
    current.push(row);
    groups.set(key, current);
  }

  const summaryRows = Array.from(groups.values()).map((group) => {
    const [first] = group;
    const values = group.map((row) => row.value);
    return {
      metric: first?.metric ?? "LCP",
      route: first?.route ?? "/",
      count: group.length,
      p75: percentile(values, 75),
      p95: percentile(values, 95),
      goodCount: group.filter((row) => row.rating === "GOOD").length,
      needsImprovementCount: group.filter((row) => row.rating === "NEEDS_IMPROVEMENT").length,
      poorCount: group.filter((row) => row.rating === "POOR").length,
      latestAt: group.reduce<Date | null>((latest, row) => {
        if (!latest || row.createdAt > latest) {
          return row.createdAt;
        }
        return latest;
      }, null),
    };
  });

  const metricOrder = new Map<WebVitalMetric, number>(
    WEB_VITAL_METRICS.map((metric, index) => [metric as WebVitalMetric, index]),
  );

  return {
    days,
    limit,
    schemaSyncRequired: false,
    sampleCount: rows.length,
    rows: summaryRows.sort((left, right) => {
      const metricDiff =
        (metricOrder.get(left.metric) ?? Number.MAX_SAFE_INTEGER) -
        (metricOrder.get(right.metric) ?? Number.MAX_SAFE_INTEGER);
      if (metricDiff !== 0) {
        return metricDiff;
      }
      return right.count - left.count || left.route.localeCompare(right.route);
    }),
  };
}

export async function getWebVitalSummary(
  options: WebVitalSummaryOptions = {},
): Promise<WebVitalSummary> {
  const days = clampInteger(options.days, DEFAULT_DAYS, 1, 90);
  const limit = clampInteger(options.limit, DEFAULT_LIMIT, 100, 50_000);
  const delegate = getWebVitalSampleDelegate();

  if (!delegate) {
    return { days, limit, schemaSyncRequired: true, sampleCount: 0, rows: [] };
  }

  try {
    const rows = await delegate.findMany({
      where: {
        createdAt: { gte: getSinceDate(days) },
      },
      select: {
        metric: true,
        value: true,
        rating: true,
        route: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return summarizeRows(rows, days, limit);
  } catch (error) {
    if (isMissingWebVitalSchemaError(error)) {
      return { days, limit, schemaSyncRequired: true, sampleCount: 0, rows: [] };
    }
    throw error;
  }
}
