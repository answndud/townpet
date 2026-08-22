import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildAuthEmailDeliveryRateLimitRules,
  enforceAuthEmailDeliveryRateLimit,
} from "@/server/auth-email-rate-limit";
import { enforceRateLimit } from "@/server/rate-limit";

vi.mock("@/server/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

describe("auth email delivery rate limit", () => {
  beforeEach(() => {
    mockEnforceRateLimit.mockReset();
    mockEnforceRateLimit.mockResolvedValue();
  });

  it("limits by email and IP, email, and shared burst/daily quotas", () => {
    const rules = buildAuthEmailDeliveryRateLimitRules({
      email: " USER@TownPet.dev ",
      clientIp: "203.0.113.10",
    });

    expect(rules).toHaveLength(4);
    expect(rules[0]).toMatchObject({ limit: 3, windowMs: 30 * 60_000, failureMode: "closed" });
    expect(rules[1]).toMatchObject({ limit: 5, windowMs: 24 * 60 * 60_000, failureMode: "closed" });
    expect(rules[2]).toMatchObject({
      key: "auth:email-delivery:global:burst",
      limit: 100,
      windowMs: 10 * 60_000,
      failureMode: "closed",
    });
    expect(rules[3]).toMatchObject({
      key: "auth:email-delivery:global:daily",
      limit: 1_000,
      windowMs: 24 * 60 * 60_000,
      failureMode: "closed",
    });
    expect(rules[0]?.key).not.toContain("USER@TownPet.dev");
  });

  it("enforces every rule so one shared quota cannot be bypassed", async () => {
    await enforceAuthEmailDeliveryRateLimit({
      email: "user@townpet.dev",
      clientIp: "203.0.113.10",
    });

    expect(mockEnforceRateLimit).toHaveBeenCalledTimes(4);
    expect(mockEnforceRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ key: "auth:email-delivery:global:daily", failureMode: "closed" }),
    );
  });
});
