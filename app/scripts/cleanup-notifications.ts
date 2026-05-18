import "dotenv/config";
import { PrismaClient } from "@prisma/client";

import {
  cleanupArchivedNotifications,
  resolveNotificationRetentionDays,
} from "@/server/notification-retention";
import {
  formatMaintenanceMode,
  isDryRunMode,
  resolveMaintenanceRunMode,
} from "./maintenance-run-mode";

const prisma = new PrismaClient();

async function main() {
  const mode = resolveMaintenanceRunMode({
    applyEnvName: "NOTIFICATION_CLEANUP_APPLY",
  });
  const retentionDays = resolveNotificationRetentionDays();
  const result = await cleanupArchivedNotifications({
    delegate: prisma.notification,
    retentionDays,
    dryRun: isDryRunMode(mode),
  });

  console.log(
    `${isDryRunMode(mode) ? "Would delete" : "Deleted"} ${result.count} notifications archived before ${result.cutoff.toISOString()} (mode: ${formatMaintenanceMode(mode)}).`,
  );
  if (isDryRunMode(mode)) {
    console.log("Dry-run mode. Re-run with --apply to delete rows.");
  }
}

main()
  .catch((error) => {
    console.error("Notification cleanup failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
