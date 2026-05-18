import { describe, expect, it, vi } from "vitest";

import {
  buildAuthAuditRetentionCutoff,
  cleanupAuthAuditLogs,
  resolveAuthAuditRetentionDays,
} from "@/server/auth-audit-retention";

describe("auth audit retention", () => {
  it("uses 180 days by default", () => {
    expect(resolveAuthAuditRetentionDays(undefined)).toBe(180);
  });

  it("rejects invalid retention values", () => {
    expect(() => resolveAuthAuditRetentionDays("0")).toThrow(
      "AUTH_AUDIT_RETENTION_DAYS must be a positive number.",
    );
  });

  it("deletes audit logs older than the cutoff", async () => {
    const count = vi.fn().mockResolvedValue(8);
    const deleteMany = vi.fn().mockResolvedValue({ count: 8 });
    const now = new Date("2026-03-07T00:00:00.000Z");

    const result = await cleanupAuthAuditLogs({
      delegate: { count, deleteMany },
      retentionDays: 180,
      now,
    });

    expect(buildAuthAuditRetentionCutoff(180, now).toISOString()).toBe(
      "2025-09-08T00:00:00.000Z",
    );
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        createdAt: {
          lt: new Date("2025-09-08T00:00:00.000Z"),
        },
      },
    });
    expect(result).toEqual({
      count: 8,
      cutoff: new Date("2025-09-08T00:00:00.000Z"),
    });
  });

  it("counts matching audit logs without deleting in dry-run mode", async () => {
    const count = vi.fn().mockResolvedValue(3);
    const deleteMany = vi.fn();
    const now = new Date("2026-03-07T00:00:00.000Z");

    const result = await cleanupAuthAuditLogs({
      delegate: { count, deleteMany },
      retentionDays: 180,
      now,
      dryRun: true,
    });

    expect(count).toHaveBeenCalledWith({
      where: {
        createdAt: {
          lt: new Date("2025-09-08T00:00:00.000Z"),
        },
      },
    });
    expect(deleteMany).not.toHaveBeenCalled();
    expect(result.count).toBe(3);
  });
});
