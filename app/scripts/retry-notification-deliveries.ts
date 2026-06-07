import "dotenv/config";

import { isDryRunMode, resolveMaintenanceRunMode } from "./maintenance-run-mode";

type NotificationDeliveryRetryStats = {
  pending: number;
  failed: number;
  due: number;
  checkedAt: Date;
};

type NotificationDeliveryRetryResult = {
  scanned: number;
  delivered: number;
  failed: number;
  skipped: number;
  deliveryIds: {
    delivered: string[];
    failed: string[];
    skipped: string[];
  };
};

type NotificationDeliveryRetryDeps = {
  flushNotificationDeliveries(params: { limit: number }): Promise<NotificationDeliveryRetryResult>;
  getNotificationDeliveryOutboxStats(): Promise<NotificationDeliveryRetryStats>;
};

export function readPositiveInt(name: string, fallback: number, raw = process.env[name]) {
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return value;
}

export function formatNotificationDeliveryRetryOutput(params:
  | {
      mode: "dry-run";
      limit: number;
      before: NotificationDeliveryRetryStats;
    }
  | {
      mode: "retry";
      limit: number;
      before: NotificationDeliveryRetryStats;
      result: NotificationDeliveryRetryResult;
      after: NotificationDeliveryRetryStats;
    }) {
  return JSON.stringify(params, null, 2);
}

export async function runNotificationDeliveryRetry(deps: NotificationDeliveryRetryDeps) {
  const limit = readPositiveInt("NOTIFICATION_OUTBOX_RETRY_LIMIT", 50);
  const dryRun = isDryRunMode(
    resolveMaintenanceRunMode({
      dryRunEnvName: "NOTIFICATION_OUTBOX_RETRY_DRY_RUN",
      applyEnvName: "NOTIFICATION_OUTBOX_RETRY_APPLY",
    }),
  );

  const before = await deps.getNotificationDeliveryOutboxStats();

  if (dryRun) {
    return formatNotificationDeliveryRetryOutput({
      mode: "dry-run",
      limit,
      before,
    });
  }

  const result = await deps.flushNotificationDeliveries({ limit });
  const after = await deps.getNotificationDeliveryOutboxStats();

  return formatNotificationDeliveryRetryOutput({
    mode: "retry",
    limit,
    before,
    result,
    after,
  });
}

async function main() {
  const [{ flushNotificationDeliveries, getNotificationDeliveryOutboxStats }, { prisma }] =
    await Promise.all([
      import("@/server/queries/notification.queries"),
      import("@/lib/prisma"),
    ]);

  try {
    console.log(
      await runNotificationDeliveryRetry({
        flushNotificationDeliveries,
        getNotificationDeliveryOutboxStats,
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (
  process.env.NODE_ENV !== "test" &&
  process.argv[1]?.endsWith("retry-notification-deliveries.ts")
) {
  main().catch((error) => {
    console.error("Notification delivery outbox retry failed", error);
    process.exit(1);
  });
}
