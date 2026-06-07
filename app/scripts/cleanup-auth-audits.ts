import "dotenv/config";
import { PrismaClient } from "@prisma/client";

import {
  cleanupAuthAuditLogs,
  resolveAuthAuditRetentionDays,
} from "@/server/auth-audit-retention";
import {
  formatMaintenanceMode,
  isDryRunMode,
  type MaintenanceRunMode,
  resolveMaintenanceRunMode,
} from "./maintenance-run-mode";

type AuthAuditCleanupPrisma = Pick<PrismaClient, "authAuditLog" | "$disconnect">;

export function formatAuthAuditCleanupOutput(params: {
  mode: MaintenanceRunMode;
  count: number;
  cutoff: Date;
  retentionDays: number;
}) {
  const lines = [
    `${isDryRunMode(params.mode) ? "Would delete" : "Deleted"} ${params.count} auth audit logs older than ${params.retentionDays} days (cutoff: ${params.cutoff.toISOString()}, mode: ${formatMaintenanceMode(params.mode)}).`,
  ];

  if (isDryRunMode(params.mode)) {
    lines.push("Dry-run mode. Re-run with --apply to delete rows.");
  }

  return lines.join("\n");
}

export async function runAuthAuditCleanup(prisma: AuthAuditCleanupPrisma) {
  const mode = resolveMaintenanceRunMode({
    applyEnvName: "AUTH_AUDIT_CLEANUP_APPLY",
  });
  const retentionDays = resolveAuthAuditRetentionDays();
  const result = await cleanupAuthAuditLogs({
    delegate: prisma.authAuditLog,
    retentionDays,
    dryRun: isDryRunMode(mode),
  });

  return formatAuthAuditCleanupOutput({
    mode,
    count: result.count,
    cutoff: result.cutoff,
    retentionDays,
  });
}

async function main(prisma: AuthAuditCleanupPrisma = new PrismaClient()) {
  console.log(await runAuthAuditCleanup(prisma));
}

if (
  process.env.NODE_ENV !== "test" &&
  process.argv[1]?.endsWith("cleanup-auth-audits.ts")
) {
  const prisma = new PrismaClient();
  main(prisma)
    .catch((error) => {
      console.error("Auth audit cleanup failed", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
