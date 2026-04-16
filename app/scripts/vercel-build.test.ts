import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  runBuildVercel,
  shouldRunSecurityEnvPreflight,
} from "@/../scripts/vercel-build";

describe("vercel-build security preflight", () => {
  beforeEach(() => {
    delete process.env.DEPLOY_SECURITY_PREFLIGHT_SKIP;
    delete process.env.DEPLOY_SECURITY_PREFLIGHT_STRICT;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_TARGET_ENV;
  });

  it("enables strict preflight for production vercel targets", () => {
    expect(
      shouldRunSecurityEnvPreflight({
        NODE_ENV: "production",
        VERCEL_ENV: "production",
      }),
    ).toBe(true);
    expect(
      shouldRunSecurityEnvPreflight({
        NODE_ENV: "production",
        VERCEL_TARGET_ENV: "production",
      }),
    ).toBe(true);
  });

  it("enables strict preflight for preview and staging vercel targets", () => {
    expect(
      shouldRunSecurityEnvPreflight({
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
      }),
    ).toBe(true);
    expect(
      shouldRunSecurityEnvPreflight({
        NODE_ENV: "production",
        VERCEL_TARGET_ENV: "staging",
      }),
    ).toBe(true);
  });

  it("skips strict preflight outside Vercel targets unless explicitly forced", () => {
    expect(
      shouldRunSecurityEnvPreflight({
        NODE_ENV: "production",
      }),
    ).toBe(false);
    expect(
      shouldRunSecurityEnvPreflight({
        NODE_ENV: "production",
        VERCEL_ENV: "development",
      }),
    ).toBe(false);
    expect(
      shouldRunSecurityEnvPreflight({
        NODE_ENV: "production",
        DEPLOY_SECURITY_PREFLIGHT_STRICT: "1",
      }),
    ).toBe(true);
  });

  it("stops the build before prisma deploy when security preflight fails", async () => {
    process.env.VERCEL_ENV = "production";

    const commandRunner = vi
      .fn()
      .mockResolvedValueOnce({ code: 1, output: "missing AUTH_SECRET" });

    await expect(runBuildVercel(commandRunner)).rejects.toThrow(
      "[build:vercel] security env preflight failed.",
    );

    expect(commandRunner).toHaveBeenCalledTimes(1);
    expect(commandRunner).toHaveBeenCalledWith("pnpm", ["ops:check:security-env:strict"]);
  });

  it("runs security preflight before deploy steps on production builds", async () => {
    process.env.VERCEL_ENV = "production";

    const commandRunner = vi.fn().mockResolvedValue({
      code: 0,
      output: "",
    });

    await runBuildVercel(commandRunner);

    expect(commandRunner.mock.calls).toEqual([
      ["pnpm", ["ops:check:security-env:strict"]],
      ["pnpm", ["prisma", "migrate", "deploy"]],
      ["pnpm", ["prisma", "generate"]],
      ["pnpm", ["next", "build"]],
    ]);
  });

  it("stops the build before prisma generate when prisma deploy fails", async () => {
    process.env.VERCEL_ENV = "production";

    const commandRunner = vi
      .fn()
      .mockResolvedValueOnce({ code: 0, output: "security ok" })
      .mockResolvedValueOnce({ code: 1, output: "migration failed" });

    await expect(runBuildVercel(commandRunner)).rejects.toThrow(
      "[build:vercel] prisma migrate deploy failed.",
    );

    expect(commandRunner.mock.calls).toEqual([
      ["pnpm", ["ops:check:security-env:strict"]],
      ["pnpm", ["prisma", "migrate", "deploy"]],
    ]);
  });

  it("stops the build before next build when prisma generate fails", async () => {
    process.env.VERCEL_ENV = "production";

    const commandRunner = vi
      .fn()
      .mockResolvedValueOnce({ code: 0, output: "security ok" })
      .mockResolvedValueOnce({ code: 0, output: "deploy ok" })
      .mockResolvedValueOnce({ code: 1, output: "vercel prisma generate safeguard" });

    await expect(runBuildVercel(commandRunner)).rejects.toThrow(
      "[build:vercel] prisma generate failed.",
    );

    expect(commandRunner.mock.calls).toEqual([
      ["pnpm", ["ops:check:security-env:strict"]],
      ["pnpm", ["prisma", "migrate", "deploy"]],
      ["pnpm", ["prisma", "generate"]],
    ]);
  });
});
