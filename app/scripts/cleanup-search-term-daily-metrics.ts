import "dotenv/config";
import { PrismaClient } from "@prisma/client";

import {
  cleanupSearchTermDailyMetrics,
  resolveSearchTermDailyMetricRetentionDays,
} from "@/server/search-term-daily-metric-retention";
import {
  formatMaintenanceMode,
  isDryRunMode,
  resolveMaintenanceRunMode,
} from "./maintenance-run-mode";

const prisma = new PrismaClient();

async function main() {
  const mode = resolveMaintenanceRunMode({
    applyEnvName: "SEARCH_TERM_DAILY_METRIC_CLEANUP_APPLY",
  });
  const retentionDays = resolveSearchTermDailyMetricRetentionDays();
  const result = await cleanupSearchTermDailyMetrics({
    delegate: prisma.searchTermDailyMetric,
    retentionDays,
    dryRun: isDryRunMode(mode),
  });

  console.log(
    `${isDryRunMode(mode) ? "Would delete" : "Deleted"} ${result.count} SearchTermDailyMetric rows older than ${result.cutoff.toISOString()} (mode: ${formatMaintenanceMode(mode)}).`,
  );
  if (isDryRunMode(mode)) {
    console.log("Dry-run mode. Re-run with --apply to delete rows.");
  }
}

main()
  .catch((error) => {
    console.error("Search term daily metric cleanup failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
