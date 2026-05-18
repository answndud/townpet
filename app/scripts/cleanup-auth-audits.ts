import "dotenv/config";
import { PrismaClient } from "@prisma/client";

import {
  cleanupAuthAuditLogs,
  resolveAuthAuditRetentionDays,
} from "@/server/auth-audit-retention";
import {
  formatMaintenanceMode,
  isDryRunMode,
  resolveMaintenanceRunMode,
} from "./maintenance-run-mode";

const prisma = new PrismaClient();

async function main() {
  const mode = resolveMaintenanceRunMode({
    applyEnvName: "AUTH_AUDIT_CLEANUP_APPLY",
  });
  const retentionDays = resolveAuthAuditRetentionDays();
  const result = await cleanupAuthAuditLogs({
    delegate: prisma.authAuditLog,
    retentionDays,
    dryRun: isDryRunMode(mode),
  });

  console.log(
    `${isDryRunMode(mode) ? "Would delete" : "Deleted"} ${result.count} auth audit logs older than ${retentionDays} days (cutoff: ${result.cutoff.toISOString()}, mode: ${formatMaintenanceMode(mode)}).`,
  );
  if (isDryRunMode(mode)) {
    console.log("Dry-run mode. Re-run with --apply to delete rows.");
  }
}

main()
  .catch((error) => {
    console.error("Auth audit cleanup failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
