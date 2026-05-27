import { mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_ENV_KEY,
  AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_VALUE,
} from "./check-auth-local-detail-visual-smoke";
import {
  buildDetailVisualSmokeSteps,
  resolveDetailVisualSmokeConfig,
  runDetailVisualSmoke,
  validateDetailVisualSmokeConfig,
  type DetailVisualSmokeConfig,
} from "./run-detail-visual-smoke";

function createConfig(overrides: Partial<DetailVisualSmokeConfig> = {}): DetailVisualSmokeConfig {
  const tempDir = path.join(os.tmpdir(), `townpet-detail-visual-smoke-test-${Date.now()}`);
  return {
    baseUrl: "https://townpet.vercel.app",
    outputPath: path.join(tempDir, "detail-visual-smoke.md"),
    includeAuthLocal: true,
    continueOnFailure: true,
    ...overrides,
  };
}

function scriptNameFromArgs(args: string[]) {
  return args.at(-1);
}

describe("detail visual smoke runner", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("runs health, public detail, and auth/local detail by default", () => {
    const config = resolveDetailVisualSmokeConfig({
      OPS_BASE_URL: "https://townpet.vercel.app",
      [AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_ENV_KEY]: AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_VALUE,
    });
    const steps = buildDetailVisualSmokeSteps(config);

    expect(config.baseUrl).toBe("https://townpet.vercel.app");
    expect(config.includeAuthLocal).toBe(true);
    expect(steps.map((step) => step.id)).toEqual([
      "health",
      "public-detail-visual",
      "auth-local-detail-visual",
    ]);
    expect(steps.map((step) => scriptNameFromArgs(step.args))).toEqual([
      "ops:check:health",
      "ops:check:public-detail-visual",
      "ops:check:auth-local-detail-visual",
    ]);
  });

  it("requires explicit confirmation before auth/local fixture upsert", () => {
    const config = createConfig({ includeAuthLocal: true });

    expect(() => validateDetailVisualSmokeConfig(config, {})).toThrow(
      "AUTH_LOCAL_DETAIL_SMOKE_CONFIRM=PUBLISH_AUTH_LOCAL_DETAIL_SMOKE_FIXTURES",
    );
    expect(() =>
      validateDetailVisualSmokeConfig(config, {
        [AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_ENV_KEY]: AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_VALUE,
      }),
    ).not.toThrow();
  });

  it("supports public-only visual smoke when auth/local is explicitly skipped", () => {
    const config = resolveDetailVisualSmokeConfig({
      DETAIL_VISUAL_SMOKE_SKIP_AUTH_LOCAL: "1",
    });
    const steps = buildDetailVisualSmokeSteps(config);

    expect(config.includeAuthLocal).toBe(false);
    expect(steps.map((step) => step.id)).toEqual(["health", "public-detail-visual"]);
    expect(() => validateDetailVisualSmokeConfig(config, {})).not.toThrow();
  });

  it("writes a passing run report", async () => {
    const config = createConfig();
    const commandRunner = vi.fn().mockResolvedValue({ code: 0, output: "ok" });
    vi.stubEnv(AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_ENV_KEY, AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_VALUE);

    await mkdir(path.dirname(config.outputPath), { recursive: true });
    await runDetailVisualSmoke(config, commandRunner);

    const report = await readFile(config.outputPath, "utf8");
    expect(commandRunner.mock.calls.map((call) => scriptNameFromArgs(call[1]))).toEqual([
      "ops:check:health",
      "ops:check:public-detail-visual",
      "ops:check:auth-local-detail-visual",
    ]);
    expect(report).toContain("- status: PASS");
    expect(report).toContain("- auth-local-detail-visual: PASS");

    await rm(path.dirname(config.outputPath), { recursive: true, force: true });
  });

  it("records failures and exits non-zero after completing the sequence", async () => {
    const config = createConfig();
    const commandRunner = vi
      .fn()
      .mockResolvedValueOnce({ code: 0, output: "health ok" })
      .mockResolvedValueOnce({ code: 1, output: "public smoke failed" })
      .mockResolvedValueOnce({ code: 0, output: "auth local ok" });
    vi.stubEnv(AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_ENV_KEY, AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_VALUE);

    await mkdir(path.dirname(config.outputPath), { recursive: true });
    await expect(runDetailVisualSmoke(config, commandRunner)).rejects.toThrow(
      "[detail-visual-smoke] required checks failed.",
    );

    const report = await readFile(config.outputPath, "utf8");
    expect(report).toContain("- status: FAIL");
    expect(report).toContain("- public-detail-visual: FAIL");
    expect(report).toContain("public smoke failed");
    expect(commandRunner).toHaveBeenCalledTimes(3);

    await rm(path.dirname(config.outputPath), { recursive: true, force: true });
  });
});
