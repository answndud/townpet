import { describe, expect, it, vi } from "vitest";

import {
  evaluateSecurityEnv,
  resolveSecurityEnvProfile,
} from "@/../scripts/check-security-env";

const baseStrictEnv: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  SECURITY_ENV_STRICT: "1",
  AUTH_SECRET: "x".repeat(48),
  GUEST_HASH_PEPPER: "pepper-secret",
  HEALTH_INTERNAL_TOKEN: "health-secret",
  UPSTASH_REDIS_REST_URL: "https://upstash.example.com",
  UPSTASH_REDIS_REST_TOKEN: "upstash-token",
  RESEND_API_KEY: "resend-token",
  BLOB_READ_WRITE_TOKEN: "blob-token",
  ENABLE_SOCIAL_DEV_LOGIN: "0",
  ENABLE_DEMO_AUTH_FALLBACK: "0",
};

describe("check-security-env profiles", () => {
  it("resolves build profile from cli arg", () => {
    expect(resolveSecurityEnvProfile(["--profile=build"])).toBe("build");
    expect(
      resolveSecurityEnvProfile(
        [],
        { SECURITY_ENV_PROFILE: "build" } as unknown as NodeJS.ProcessEnv,
      ),
    ).toBe("build");
    expect(resolveSecurityEnvProfile(["--profile=full"])).toBe("full");
  });

  it("skips remote control plane health checks in build profile", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    const evaluation = await evaluateSecurityEnv({
      env: {
        ...baseStrictEnv,
        OPS_BASE_URL: "https://townpet.example.com",
      },
      profile: "build",
      fetchImpl,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(evaluation.failed).toEqual([]);
    expect(evaluation.results.find((result) => result.key === "MODERATION_CONTROL_PLANE_HEALTH")).toBeUndefined();
  });

  it("keeps remote control plane health checks in full profile", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    const evaluation = await evaluateSecurityEnv({
      env: {
        ...baseStrictEnv,
        OPS_BASE_URL: "https://townpet.example.com",
      },
      profile: "full",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(evaluation.failed.map((result) => result.key)).toContain("MODERATION_CONTROL_PLANE_HEALTH");
  });

  it("still fails missing local required envs in build profile", async () => {
    const evaluation = await evaluateSecurityEnv({
      env: {
        ...baseStrictEnv,
        GUEST_HASH_PEPPER: "",
      },
      profile: "build",
    });

    expect(evaluation.failed.map((result) => result.key)).toContain("GUEST_HASH_PEPPER");
  });
});
