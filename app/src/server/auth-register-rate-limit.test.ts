import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildRegisterPreValidationRateLimitRules,
  buildRegisterValidatedRateLimitRules,
  enforceRegisterRateLimitRules,
} from "@/server/auth-register-rate-limit";
import { hashLoginIdentifierEmail } from "@/server/auth-login-identifier";
import { enforceRateLimit } from "@/server/rate-limit";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/server/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
}));

const mockEnforceRateLimit = vi.mocked(enforceRateLimit);

describe("auth-register-rate-limit", () => {
  beforeEach(() => {
    mockEnforceRateLimit.mockReset();
    mockEnforceRateLimit.mockResolvedValue();
  });

  it("builds pre-validation rules with hashed fingerprint keys", () => {
    const rules = buildRegisterPreValidationRateLimitRules({
      clientIp: "203.0.113.10",
      fingerprint: "browser-fp-1",
    });

    expect(rules).toHaveLength(2);
    expect(rules[0]).toMatchObject({
      key: "auth:register:ip:203.0.113.10",
      limit: 6,
      windowMs: 600_000,
      reasonCode: "REGISTER_RATE_LIMIT_IP",
    });
    expect(rules[1]).toMatchObject({
      limit: 4,
      windowMs: 600_000,
      reasonCode: "REGISTER_RATE_LIMIT_FINGERPRINT",
    });
    expect(rules[1]?.key).toMatch(/^auth:register:fingerprint:[a-f0-9]{64}$/);
    expect(rules[1]?.key).not.toContain("browser-fp-1");
  });

  it("builds validated rules with normalized email keys", () => {
    const emailHash = hashLoginIdentifierEmail("user@townpet.dev");
    const rules = buildRegisterValidatedRateLimitRules({
      email: "  USER@TownPet.dev ",
      clientIp: "203.0.113.10",
    });

    expect(rules).toEqual([
      expect.objectContaining({
        key: `auth:register:email-ip:${emailHash}:203.0.113.10`,
        limit: 3,
        windowMs: 1_800_000,
        reasonCode: "REGISTER_RATE_LIMIT_EMAIL_IP",
      }),
      expect.objectContaining({
        key: `auth:register:email:${emailHash}`,
        limit: 5,
        windowMs: 86_400_000,
        reasonCode: "REGISTER_RATE_LIMIT_EMAIL",
      }),
    ]);
  });

  it("returns the matching reason when a rule is rate limited", async () => {
    mockEnforceRateLimit.mockResolvedValueOnce(undefined).mockRejectedValueOnce(
      new ServiceError("too many", "RATE_LIMITED", 429),
    );

    const result = await enforceRegisterRateLimitRules([
      {
        key: "auth:register:ip:203.0.113.10",
        limit: 6,
        windowMs: 600_000,
        reasonCode: "REGISTER_RATE_LIMIT_IP",
      },
      {
        key: "auth:register:email:hash",
        limit: 5,
        windowMs: 86_400_000,
        reasonCode: "REGISTER_RATE_LIMIT_EMAIL",
      },
    ]);

    expect(result).toEqual({
      limited: true,
      reasonCode: "REGISTER_RATE_LIMIT_EMAIL",
    });
  });

  it("rethrows unexpected rate limit backend failures", async () => {
    mockEnforceRateLimit.mockRejectedValue(new Error("redis down"));

    await expect(
      enforceRegisterRateLimitRules([
        {
          key: "auth:register:ip:203.0.113.10",
          limit: 6,
          windowMs: 600_000,
          reasonCode: "REGISTER_RATE_LIMIT_IP",
        },
      ]),
    ).rejects.toThrow("redis down");
  });
});
