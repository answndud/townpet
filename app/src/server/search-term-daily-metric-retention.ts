type SearchTermDailyMetricCleanupDelegate = {
  deleteMany(args: {
    where: {
      day: {
        lt: Date;
      };
    };
  }): Promise<{ count: number }>;
};

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function resolveSearchTermDailyMetricRetentionDays(
  raw = process.env.SEARCH_TERM_DAILY_METRIC_RETENTION_DAYS,
) {
  const retentionDays = Number(raw ?? "90");
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
    throw new Error("SEARCH_TERM_DAILY_METRIC_RETENTION_DAYS must be a positive number.");
  }

  return retentionDays;
}

export function buildSearchTermDailyMetricRetentionCutoff(
  retentionDays: number,
  now = new Date(),
) {
  const kstDayIndex = Math.floor((now.getTime() + KST_OFFSET_MS) / DAY_MS);
  return new Date((kstDayIndex - retentionDays) * DAY_MS - KST_OFFSET_MS);
}

export async function cleanupSearchTermDailyMetrics(params: {
  delegate: SearchTermDailyMetricCleanupDelegate;
  retentionDays: number;
  now?: Date;
}) {
  const cutoff = buildSearchTermDailyMetricRetentionCutoff(params.retentionDays, params.now);
  const result = await params.delegate.deleteMany({
    where: {
      day: {
        lt: cutoff,
      },
    },
  });

  return {
    count: result.count,
    cutoff,
  };
}
