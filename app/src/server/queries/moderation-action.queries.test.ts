import { beforeEach, describe, expect, it, vi } from "vitest";
import { ModerationActionType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  listHospitalReviewFlagLogs,
  listModerationActionLogs,
} from "@/server/queries/moderation-action.queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    moderationActionLog: {
      findMany: vi.fn(),
    },
  },
}));

const mockFindMany = vi.mocked(prisma.moderationActionLog.findMany);

describe("moderation action queries", () => {
  beforeEach(() => {
    mockFindMany.mockReset();
    mockFindMany.mockResolvedValue([] as never);
  });

  it("filters by action and query while including actor and target metadata", async () => {
    await listModerationActionLogs({
      action: ModerationActionType.SANCTION_ISSUED,
      query: "user-1",
      limit: 20,
    });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 20,
        where: expect.objectContaining({
          action: ModerationActionType.SANCTION_ISSUED,
          OR: expect.arrayContaining([
            { actorId: { contains: "user-1", mode: "insensitive" } },
            { targetId: { contains: "user-1", mode: "insensitive" } },
          ]),
        }),
        include: expect.objectContaining({
          actor: expect.any(Object),
          targetUser: expect.any(Object),
          report: expect.any(Object),
        }),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    );
  });

  it("filters hospital review flags by metadata signal and hospital name", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "log-1",
        action: ModerationActionType.HOSPITAL_REVIEW_FLAGGED,
        targetId: "post-1",
        createdAt: new Date("2026-03-11T00:00:00Z"),
        actor: {
          id: "user-1",
          email: "reviewer@example.com",
          nickname: "리뷰어",
        },
        targetUser: null,
        report: null,
        metadata: {
          hospitalName: "타운동물병원",
          signals: ["NEW_ACCOUNT", "REVIEW_BURST"],
          sameHospitalReviewCount30d: 1,
          recentHospitalReviewCount7d: 3,
        },
      },
      {
        id: "log-2",
        action: ModerationActionType.HOSPITAL_REVIEW_FLAGGED,
        targetId: "post-2",
        createdAt: new Date("2026-03-10T00:00:00Z"),
        actor: {
          id: "user-2",
          email: "other@example.com",
          nickname: "다른리뷰어",
        },
        targetUser: null,
        report: null,
        metadata: {
          hospitalName: "다른병원",
          signals: ["SAME_HOSPITAL_REPEAT"],
        },
      },
    ] as never);

    const logs = await listHospitalReviewFlagLogs({
      signal: "REVIEW_BURST",
      query: "타운",
      limit: 20,
    });

    expect(logs).toHaveLength(1);
    expect(logs[0]?.id).toBe("log-1");
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { action: ModerationActionType.HOSPITAL_REVIEW_FLAGGED },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    );
  });
});
