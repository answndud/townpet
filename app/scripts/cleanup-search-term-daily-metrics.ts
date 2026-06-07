import "dotenv/config";
import { PrismaClient } from "@prisma/client";

import {
  cleanupSearchTermDailyMetrics,
  resolveSearchTermDailyMetricRetentionDays,
} from "@/server/search-term-daily-metric-retention";
import {
  formatMaintenanceMode,
  isDryRunMode,
  type MaintenanceRunMode,
  resolveMaintenanceRunMode,
} from "./maintenance-run-mode";

type SearchTermDailyMetricCleanupPrisma = Pick<
  PrismaClient,
  "searchTermDailyMetric" | "$disconnect"
>;

export function formatSearchTermDailyMetricCleanupOutput(params: {
  mode: MaintenanceRunMode;
  count: number;
  cutoff: Date;
}) {
  const lines = [
    `${isDryRunMode(params.mode) ? "Would delete" : "Deleted"} ${params.count} SearchTermDailyMetric rows older than ${params.cutoff.toISOString()} (mode: ${formatMaintenanceMode(params.mode)}).`,
  ];

  if (isDryRunMode(params.mode)) {
    lines.push("Dry-run mode. Re-run with --apply to delete rows.");
  }

  return lines.join("\n");
}

export async function runSearchTermDailyMetricCleanup(
  prisma: SearchTermDailyMetricCleanupPrisma,
) {
  const mode = resolveMaintenanceRunMode({
    applyEnvName: "SEARCH_TERM_DAILY_METRIC_CLEANUP_APPLY",
  });
  const retentionDays = resolveSearchTermDailyMetricRetentionDays();
  const result = await cleanupSearchTermDailyMetrics({
    delegate: prisma.searchTermDailyMetric,
    retentionDays,
    dryRun: isDryRunMode(mode),
  });

  return formatSearchTermDailyMetricCleanupOutput({
    mode,
    count: result.count,
    cutoff: result.cutoff,
  });
}

async function main(prisma: SearchTermDailyMetricCleanupPrisma = new PrismaClient()) {
  console.log(await runSearchTermDailyMetricCleanup(prisma));
}

if (
  process.env.NODE_ENV !== "test" &&
  process.argv[1]?.endsWith("cleanup-search-term-daily-metrics.ts")
) {
  const prisma = new PrismaClient();
  main(prisma)
    .catch((error) => {
      console.error("Search term daily metric cleanup failed", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
