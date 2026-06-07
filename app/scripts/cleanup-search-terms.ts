import "dotenv/config";
import { PrismaClient } from "@prisma/client";

import {
  cleanupSearchTermStats,
  resolveSearchTermRetentionDays,
} from "@/server/search-term-stat-retention";
import {
  formatMaintenanceMode,
  isDryRunMode,
  type MaintenanceRunMode,
  resolveMaintenanceRunMode,
} from "./maintenance-run-mode";

type SearchTermCleanupPrisma = Pick<PrismaClient, "searchTermStat" | "$disconnect">;

export function formatSearchTermCleanupOutput(params: {
  mode: MaintenanceRunMode;
  count: number;
  cutoff: Date;
}) {
  const lines = [
    `${isDryRunMode(params.mode) ? "Would delete" : "Deleted"} ${params.count} SearchTermStat rows last updated before ${params.cutoff.toISOString()} (mode: ${formatMaintenanceMode(params.mode)}).`,
  ];

  if (isDryRunMode(params.mode)) {
    lines.push("Dry-run mode. Re-run with --apply to delete rows.");
  }

  return lines.join("\n");
}

export async function runSearchTermCleanup(prisma: SearchTermCleanupPrisma) {
  const mode = resolveMaintenanceRunMode({
    applyEnvName: "SEARCH_TERM_CLEANUP_APPLY",
  });
  const retentionDays = resolveSearchTermRetentionDays();
  const result = await cleanupSearchTermStats({
    delegate: prisma.searchTermStat,
    retentionDays,
    dryRun: isDryRunMode(mode),
  });

  return formatSearchTermCleanupOutput({
    mode,
    count: result.count,
    cutoff: result.cutoff,
  });
}

async function main(prisma: SearchTermCleanupPrisma = new PrismaClient()) {
  console.log(await runSearchTermCleanup(prisma));
}

if (
  process.env.NODE_ENV !== "test" &&
  process.argv[1]?.endsWith("cleanup-search-terms.ts")
) {
  const prisma = new PrismaClient();
  main(prisma)
    .catch((error) => {
      console.error("Search term cleanup failed", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
