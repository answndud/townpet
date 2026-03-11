import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  buildAuthenticatedWriteThrottleConfig,
  enforceAuthenticatedWriteRateLimit,
  resolveAuthenticatedWriteRiskProfile,
} from "@/server/authenticated-write-throttle";
import { enforceRateLimit } from "@/server/rate-limit";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    userSanction: {
      count: vi.fn(),
    },
  },
}));

vi.mock("@/server/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

const mockEnforceRateLimit = vi.mocked(enforceRateLimit);
const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockSanctionCount = vi.mocked(prisma.userSanction.count);

describe("authenticated write throttle", () => {
  beforeEach(() => {
    mockEnforceRateLimit.mockReset();
    mockEnforceRateLimit.mockResolvedValue(undefined);
    mockFindUnique.mockReset();
    mockFindUnique.mockResolvedValue({
      createdAt: new Date("2026-01-01T00:00:00Z"),
    } as never);
    mockSanctionCount.mockReset();
    mockSanctionCount.mockResolvedValue(0 as never);
  });

  it("applies global user/ip plus scope-specific limits for post creation", async () => {
    await enforceAuthenticatedWriteRateLimit({
      scope: "post:create",
      userId: "user-1",
      ip: "203.0.113.10",
    });

    expect(mockEnforceRateLimit).toHaveBeenCalledTimes(5);
    expect(mockEnforceRateLimit).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        key: "auth-write:user:user-1",
        limit: 18,
        windowMs: 300_000,
      }),
    );
    expect(mockEnforceRateLimit).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        key: expect.stringMatching(/^auth-write:ip:[a-f0-9]{24}$/),
        limit: 45,
        windowMs: 600_000,
      }),
    );
    expect(mockEnforceRateLimit).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        key: "post:create:user:user-1",
        limit: 5,
        windowMs: 60_000,
      }),
    );
    expect(mockEnforceRateLimit).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        key: expect.stringMatching(/^post:create:user:user-1:ip:[a-f0-9]{24}$/),
        limit: 5,
        windowMs: 60_000,
      }),
    );
    expect(mockEnforceRateLimit).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({
        key: expect.stringMatching(/^post:create:ip:[a-f0-9]{24}$/),
        limit: 12,
        windowMs: 600_000,
      }),
    );
  });

  it("uses report-specific shared ip thresholds", async () => {
    await enforceAuthenticatedWriteRateLimit({
      scope: "report:create",
      userId: "user-9",
      ip: "198.51.100.7",
    });

    expect(mockEnforceRateLimit).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({
        key: expect.stringMatching(/^report:create:ip:[a-f0-9]{24}$/),
        limit: 10,
        windowMs: 600_000,
      }),
    );
  });

  it("adds fingerprint-scoped limits when client fingerprint is provided", async () => {
    await enforceAuthenticatedWriteRateLimit({
      scope: "comment:create",
      userId: "user-fp",
      ip: "198.51.100.22",
      clientFingerprint: "device-fp-1",
    });

    expect(mockEnforceRateLimit).toHaveBeenCalledTimes(7);
    expect(mockEnforceRateLimit).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        key: expect.stringMatching(/^auth-write:fingerprint:[a-f0-9]{24}$/),
        limit: 45,
        windowMs: 600_000,
      }),
    );
    expect(mockEnforceRateLimit).toHaveBeenNthCalledWith(
      7,
      expect.objectContaining({
        key: expect.stringMatching(/^comment:create:fingerprint:[a-f0-9]{24}$/),
        limit: 30,
        windowMs: 600_000,
      }),
    );
  });

  it("marks new accounts with recent sanctions as high risk", async () => {
    mockFindUnique.mockResolvedValue({
      createdAt: new Date("2026-03-09T00:00:00Z"),
    } as never);
    mockSanctionCount.mockResolvedValue(1 as never);

    const risk = await resolveAuthenticatedWriteRiskProfile(
      "user-risk",
      new Date("2026-03-11T00:00:00Z"),
    );

    expect(risk).toEqual({
      level: "HIGH",
      reasons: expect.arrayContaining(["new_account", "recent_sanction"]),
    });
  });

  it("builds stricter scope limits for elevated users", () => {
    const config = buildAuthenticatedWriteThrottleConfig({
      scope: "comment:create",
      riskLevel: "ELEVATED",
    });

    expect(config.userGlobal).toEqual({ limit: 12, windowMs: 300_000 });
    expect(config.sharedIpGlobal).toEqual({ limit: 28, windowMs: 600_000 });
    expect(config.user).toEqual({ limit: 8, windowMs: 60_000 });
    expect(config.sharedIp).toEqual({ limit: 18, windowMs: 600_000 });
  });
});
