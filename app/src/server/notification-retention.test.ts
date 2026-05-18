import { describe, expect, it, vi } from "vitest";

import {
  buildNotificationRetentionCutoff,
  cleanupArchivedNotifications,
  resolveNotificationRetentionDays,
} from "@/server/notification-retention";

describe("notification retention", () => {
  it("uses 90 days by default", () => {
    expect(resolveNotificationRetentionDays(undefined)).toBe(90);
  });

  it("rejects invalid retention values", () => {
    expect(() => resolveNotificationRetentionDays("0")).toThrow(
      "NOTIFICATION_RETENTION_DAYS must be a positive number.",
    );
  });

  it("deletes archived rows older than the cutoff", async () => {
    const count = vi.fn().mockResolvedValue(5);
    const deleteMany = vi.fn().mockResolvedValue({ count: 5 });
    const now = new Date("2026-03-07T00:00:00.000Z");

    const result = await cleanupArchivedNotifications({
      delegate: { count, deleteMany },
      retentionDays: 90,
      now,
    });

    expect(buildNotificationRetentionCutoff(90, now).toISOString()).toBe(
      "2025-12-07T00:00:00.000Z",
    );
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        archivedAt: {
          lt: new Date("2025-12-07T00:00:00.000Z"),
        },
      },
    });
    expect(result).toEqual({
      count: 5,
      cutoff: new Date("2025-12-07T00:00:00.000Z"),
    });
  });

  it("counts archived rows without deleting in dry-run mode", async () => {
    const count = vi.fn().mockResolvedValue(2);
    const deleteMany = vi.fn();
    const now = new Date("2026-03-07T00:00:00.000Z");

    const result = await cleanupArchivedNotifications({
      delegate: { count, deleteMany },
      retentionDays: 90,
      now,
      dryRun: true,
    });

    expect(count).toHaveBeenCalledWith({
      where: {
        archivedAt: {
          lt: new Date("2025-12-07T00:00:00.000Z"),
        },
      },
    });
    expect(deleteMany).not.toHaveBeenCalled();
    expect(result.count).toBe(2);
  });
});
