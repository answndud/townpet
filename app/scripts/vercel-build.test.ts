import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  resolveSpawnSpec,
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

  it("enables build preflight for production vercel targets", () => {
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

  it("skips build preflight for preview deployments unless explicitly forced", () => {
    expect(
      shouldRunSecurityEnvPreflight({
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
      }),
    ).toBe(false);
    expect(
      shouldRunSecurityEnvPreflight({
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
        DEPLOY_SECURITY_PREFLIGHT_STRICT: "1",
      }),
    ).toBe(true);
  });

  it("lets preview deployments skip build preflight even when target env is production", () => {
    expect(
      shouldRunSecurityEnvPreflight({
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
        VERCEL_TARGET_ENV: "production",
      }),
    ).toBe(false);
  });

  it("enables build preflight for explicit staging targets", () => {
    expect(
      shouldRunSecurityEnvPreflight({
        NODE_ENV: "production",
        VERCEL_TARGET_ENV: "staging",
      }),
    ).toBe(true);
  });

  it("skips build preflight outside Vercel targets unless explicitly forced", () => {
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

  it("uses npm_execpath when pnpm is launched through Corepack", () => {
    expect(
      resolveSpawnSpec("pnpm", ["next", "build"], {
        npm_execpath: "/Users/alex/.cache/node/corepack/v1/pnpm/9.12.3/bin/pnpm.cjs",
      }),
    ).toEqual({
      command: process.execPath,
      args: [
        "/Users/alex/.cache/node/corepack/v1/pnpm/9.12.3/bin/pnpm.cjs",
        "next",
        "build",
      ],
    });

    expect(resolveSpawnSpec("node", ["script.js"], {})).toEqual({
      command: "node",
      args: ["script.js"],
    });
  });

  it("stops the build before prisma deploy when security preflight fails", async () => {
    process.env.VERCEL_ENV = "production";

    const commandRunner = vi
      .fn()
      .mockResolvedValueOnce({
        code: 1,
        output:
          "Security env check\n- [FAIL] HEALTH_INTERNAL_TOKEN: missing\n- [FAIL] UPSTASH_REDIS_REST_URL_AND_TOKEN_PAIR: missing",
      });

    await expect(runBuildVercel(commandRunner)).rejects.toThrow(
      "[build:vercel] security env preflight failed. failed checks: HEALTH_INTERNAL_TOKEN, UPSTASH_REDIS_REST_URL_AND_TOKEN_PAIR",
    );

    expect(commandRunner).toHaveBeenCalledTimes(1);
    expect(commandRunner).toHaveBeenCalledWith("pnpm", ["ops:check:security-env:build"]);
  });

  it("runs security preflight before deploy steps on production builds", async () => {
    process.env.VERCEL_ENV = "production";

    const commandRunner = vi.fn().mockResolvedValue({
      code: 0,
      output: "",
    });

    await runBuildVercel(commandRunner);

    expect(commandRunner.mock.calls).toEqual([
      ["pnpm", ["ops:check:security-env:build"]],
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
      ["pnpm", ["ops:check:security-env:build"]],
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
      ["pnpm", ["ops:check:security-env:build"]],
      ["pnpm", ["prisma", "migrate", "deploy"]],
      ["pnpm", ["prisma", "generate"]],
    ]);
  });
});
