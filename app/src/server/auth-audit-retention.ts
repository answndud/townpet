type AuthAuditCleanupDelegate = {
  count(args: {
    where: {
      createdAt: {
        lt: Date;
      };
    };
  }): Promise<number>;
  deleteMany(args: {
    where: {
      createdAt: {
        lt: Date;
      };
    };
  }): Promise<{ count: number }>;
};

export function resolveAuthAuditRetentionDays(
  raw = process.env.AUTH_AUDIT_RETENTION_DAYS,
) {
  const retentionDays = Number(raw ?? "180");
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
    throw new Error("AUTH_AUDIT_RETENTION_DAYS must be a positive number.");
  }

  return retentionDays;
}

export function buildAuthAuditRetentionCutoff(
  retentionDays: number,
  now = new Date(),
) {
  return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
}

export async function cleanupAuthAuditLogs(params: {
  delegate: AuthAuditCleanupDelegate;
  retentionDays: number;
  now?: Date;
  dryRun?: boolean;
}) {
  const cutoff = buildAuthAuditRetentionCutoff(params.retentionDays, params.now);
  const where = {
    createdAt: {
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
