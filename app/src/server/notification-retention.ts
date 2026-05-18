type NotificationCleanupDelegate = {
  count(args: {
    where: {
      archivedAt: {
        lt: Date;
      };
    };
  }): Promise<number>;
  deleteMany(args: {
    where: {
      archivedAt: {
        lt: Date;
      };
    };
  }): Promise<{ count: number }>;
};

export function resolveNotificationRetentionDays(
  raw = process.env.NOTIFICATION_RETENTION_DAYS,
) {
  const retentionDays = Number(raw ?? "90");
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
    throw new Error("NOTIFICATION_RETENTION_DAYS must be a positive number.");
  }

  return retentionDays;
}

export function buildNotificationRetentionCutoff(
  retentionDays: number,
  now = new Date(),
) {
  return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
}

export async function cleanupArchivedNotifications(params: {
  delegate: NotificationCleanupDelegate;
  retentionDays: number;
  now?: Date;
  dryRun?: boolean;
}) {
  const cutoff = buildNotificationRetentionCutoff(params.retentionDays, params.now);
  const where = {
    archivedAt: {
      lt: cutoff,
    },
  };

  if (params.dryRun) {
    const count = await params.delegate.count({ where });

    return {
      count,
      cutoff,
    };
  }

  const result = await params.delegate.deleteMany({
    where,
  });

  return {
    count: result.count,
    cutoff,
  };
}
