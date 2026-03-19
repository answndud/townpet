import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { getAuthAuditOverview } from "@/server/queries/auth-audit.queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    authAuditLog: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  authAuditLog: {
    count: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
  };
};

describe("auth audit overview queries", () => {
  beforeEach(() => {
    mockPrisma.authAuditLog.count.mockReset();
    mockPrisma.authAuditLog.groupBy.mockReset();
  });

  it("aggregates action counts and top failure reasons", async () => {
    mockPrisma.authAuditLog.count.mockResolvedValue(14);
    mockPrisma.authAuditLog.groupBy
      .mockResolvedValueOnce([
        { action: "LOGIN_SUCCESS", _count: { _all: 6 } },
        { action: "LOGIN_FAILURE", _count: { _all: 4 } },
        { action: "LOGIN_RATE_LIMITED", _count: { _all: 2 } },
      ])
      .mockResolvedValueOnce([
        { reasonCode: "INVALID_PASSWORD", _count: { _all: 3 } },
        { reasonCode: "RATE_LIMITED", _count: { _all: 2 } },
      ]);

    const overview = await getAuthAuditOverview(1);

    expect(overview.totalEvents).toBe(14);
    expect(overview.actionCounts.LOGIN_SUCCESS).toBe(6);
    expect(overview.actionCounts.LOGIN_FAILURE).toBe(4);
    expect(overview.actionCounts.LOGIN_RATE_LIMITED).toBe(2);
    expect(overview.topFailureReasons).toEqual([
      { reasonCode: "INVALID_PASSWORD", count: 3 },
      { reasonCode: "RATE_LIMITED", count: 2 },
    ]);
  });
});
