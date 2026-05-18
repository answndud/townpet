import "dotenv/config";

import { prisma } from "@/lib/prisma";
import {
  flushNotificationDeliveries,
  getNotificationDeliveryOutboxStats,
} from "@/server/queries/notification.queries";

function hasFlag(name: string) {
  return process.argv.includes(name);
}

function readPositiveInt(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return value;
}

async function main() {
  const limit = readPositiveInt("NOTIFICATION_OUTBOX_RETRY_LIMIT", 50);
  const dryRun =
    hasFlag("--dry-run") || process.env.NOTIFICATION_OUTBOX_RETRY_DRY_RUN === "1";

  const before = await getNotificationDeliveryOutboxStats();

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          limit,
          before,
        },
        null,
        2,
      ),
    );
    return;
  }

  const result = await flushNotificationDeliveries({ limit });
  const after = await getNotificationDeliveryOutboxStats();

  console.log(
    JSON.stringify(
      {
        mode: "retry",
        limit,
        before,
        result,
        after,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("Notification delivery outbox retry failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
