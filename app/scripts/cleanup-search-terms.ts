import "dotenv/config";
import { PrismaClient } from "@prisma/client";

import {
  cleanupSearchTermStats,
  resolveSearchTermRetentionDays,
} from "@/server/search-term-stat-retention";
import {
  formatMaintenanceMode,
  isDryRunMode,
  resolveMaintenanceRunMode,
} from "./maintenance-run-mode";

const prisma = new PrismaClient();

async function main() {
  const mode = resolveMaintenanceRunMode({
    applyEnvName: "SEARCH_TERM_CLEANUP_APPLY",
  });
  const retentionDays = resolveSearchTermRetentionDays();
  const result = await cleanupSearchTermStats({
    delegate: prisma.searchTermStat,
    retentionDays,
    dryRun: isDryRunMode(mode),
  });

  console.log(
    `${isDryRunMode(mode) ? "Would delete" : "Deleted"} ${result.count} SearchTermStat rows last updated before ${result.cutoff.toISOString()} (mode: ${formatMaintenanceMode(mode)}).`,
  );
  if (isDryRunMode(mode)) {
    console.log("Dry-run mode. Re-run with --apply to delete rows.");
  }
}

main()
  .catch((error) => {
    console.error("Search term cleanup failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
