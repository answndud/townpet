import "dotenv/config";
import { PrismaClient } from "@prisma/client";

import {
  cleanupArchivedNotifications,
  resolveNotificationRetentionDays,
} from "@/server/notification-retention";
import {
  formatMaintenanceMode,
  isDryRunMode,
  type MaintenanceRunMode,
  resolveMaintenanceRunMode,
} from "./maintenance-run-mode";

type NotificationCleanupPrisma = Pick<PrismaClient, "notification" | "$disconnect">;

export function formatNotificationCleanupOutput(params: {
  mode: MaintenanceRunMode;
  count: number;
  cutoff: Date;
}) {
  const lines = [
    `${isDryRunMode(params.mode) ? "Would delete" : "Deleted"} ${params.count} notifications archived before ${params.cutoff.toISOString()} (mode: ${formatMaintenanceMode(params.mode)}).`,
  ];

  if (isDryRunMode(params.mode)) {
    lines.push("Dry-run mode. Re-run with --apply to delete rows.");
  }

  return lines.join("\n");
}

export async function runNotificationCleanup(prisma: NotificationCleanupPrisma) {
  const mode = resolveMaintenanceRunMode({
    applyEnvName: "NOTIFICATION_CLEANUP_APPLY",
  });
  const retentionDays = resolveNotificationRetentionDays();
  const result = await cleanupArchivedNotifications({
    delegate: prisma.notification,
    retentionDays,
    dryRun: isDryRunMode(mode),
  });

  return formatNotificationCleanupOutput({
    mode,
    count: result.count,
    cutoff: result.cutoff,
  });
}

async function main(prisma: NotificationCleanupPrisma = new PrismaClient()) {
  console.log(await runNotificationCleanup(prisma));
}

if (
  process.env.NODE_ENV !== "test" &&
  process.argv[1]?.endsWith("cleanup-notifications.ts")
) {
  const prisma = new PrismaClient();
  main(prisma)
    .catch((error) => {
      console.error("Notification cleanup failed", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
