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
    delete process.env.DATABASE_URL;
    delete process.env.DIRECT_URL;
    delete process.env.VERCEL_USE_DIRECT_MIGRATION_URL;
    delete process.env.VERCEL;
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

  it("uses DIRECT_URL only for migrations and restores the runtime database URL", async () => {
    process.env.DEPLOY_SECURITY_PREFLIGHT_STRICT = "1";
    process.env.DATABASE_URL = "postgres://runtime-role/db";
    process.env.DIRECT_URL = "postgres://migration-role/db";
    process.env.VERCEL_USE_DIRECT_MIGRATION_URL = "1";
    const observedUrls: Array<string | undefined> = [];
    const commandRunner = vi.fn().mockImplementation(async (_command, args) => {
      observedUrls.push(process.env.DATABASE_URL);
      expect(args).toBeTruthy();
      return { code: 0, output: "" };
    });

    await runBuildVercel(commandRunner);

    expect(observedUrls).toEqual([
      "postgres://runtime-role/db",
      "postgres://migration-role/db",
      "postgres://runtime-role/db",
      "postgres://runtime-role/db",
    ]);
    expect(process.env.DATABASE_URL).toBe("postgres://runtime-role/db");
  });

  it("never selects the direct endpoint during a Vercel build", async () => {
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL = "1";
    process.env.DATABASE_URL = "postgres://pooler-role/db";
    process.env.DIRECT_URL = "postgres://direct-role/db";
    process.env.VERCEL_USE_DIRECT_MIGRATION_URL = "1";
    const observedUrls: Array<string | undefined> = [];
    const commandRunner = vi.fn().mockImplementation(async () => {
      observedUrls.push(process.env.DATABASE_URL);
      return { code: 0, output: "" };
    });

    await runBuildVercel(commandRunner);

    expect(observedUrls[1]).toBe("postgres://pooler-role/db");
    expect(process.env.DATABASE_URL).toBe("postgres://pooler-role/db");
  });

  it("keeps the reachable runtime database URL when direct migration opt-in is absent", async () => {
    process.env.VERCEL_ENV = "production";
    process.env.DATABASE_URL = "postgres://pooler-role/db";
    process.env.DIRECT_URL = "postgres://direct-role/db";
    const observedUrls: Array<string | undefined> = [];
    const commandRunner = vi.fn().mockImplementation(async () => {
      observedUrls.push(process.env.DATABASE_URL);
      return { code: 0, output: "" };
    });

    await runBuildVercel(commandRunner);

    expect(observedUrls).toEqual([
      "postgres://pooler-role/db",
      "postgres://pooler-role/db",
      "postgres://pooler-role/db",
      "postgres://pooler-role/db",
    ]);
    expect(process.env.DATABASE_URL).toBe("postgres://pooler-role/db");
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
