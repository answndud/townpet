import { mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_ENV_KEY,
  AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_VALUE,
} from "./check-auth-local-detail-visual-smoke";
import {
  buildDetailVisualSmokeMarkdown,
  buildDetailVisualSmokeSteps,
  resolveDetailVisualSmokeConfig,
  runDetailVisualSmoke,
  runDetailVisualSmokeCli,
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

  it("supports injected report writer and logger without touching the filesystem", async () => {
    const config = createConfig({ outputPath: "/tmp/townpet-detail-visual-smoke.md" });
    const commandRunner = vi.fn().mockResolvedValue({ code: 0, output: "ok" });
    const mkdirMock = vi.fn().mockResolvedValue(undefined);
    const writeFileMock = vi.fn().mockResolvedValue(undefined);
    const logMock = vi.fn();

    const result = await runDetailVisualSmoke(config, commandRunner, {
      env: {
        [AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_ENV_KEY]: AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_VALUE,
      },
      generatedAt: "2026-01-02T03:04:05.000Z",
      mkdir: mkdirMock as never,
      writeFile: writeFileMock as never,
      logger: { log: logMock },
    });

    expect(result.status).toBe("PASS");
    expect(result.markdown).toContain("- generatedAt: 2026-01-02T03:04:05.000Z");
    expect(mkdirMock).toHaveBeenCalledWith("/tmp", { recursive: true });
    expect(writeFileMock).toHaveBeenCalledWith(
      "/tmp/townpet-detail-visual-smoke.md",
      expect.stringContaining("# Detail Visual Smoke Run"),
      "utf8",
    );
    expect(logMock).toHaveBeenCalledWith("[detail-visual-smoke] completed");
  });

  it("returns CLI exit code and captured output instead of exiting directly", async () => {
    const config = createConfig({ outputPath: "/tmp/townpet-detail-visual-smoke.md" });
    const commandRunner = vi.fn().mockResolvedValue({ code: 0, output: "ok" });

    const result = await runDetailVisualSmokeCli(config, commandRunner, {
      env: {
        [AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_ENV_KEY]: AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_VALUE,
      },
      mkdir: vi.fn().mockResolvedValue(undefined) as never,
      writeFile: vi.fn().mockResolvedValue(undefined) as never,
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("[detail-visual-smoke] running health");
    expect(result.output).toContain("- status: PASS");
  });

  it("returns CLI failure output when a required command fails", async () => {
    const config = createConfig({ outputPath: "/tmp/townpet-detail-visual-smoke.md" });
    const commandRunner = vi
      .fn()
      .mockResolvedValueOnce({ code: 0, output: "health ok" })
      .mockResolvedValueOnce({ code: 1, output: "public smoke failed" })
      .mockResolvedValueOnce({ code: 0, output: "auth ok" });

    const result = await runDetailVisualSmokeCli(config, commandRunner, {
      env: {
        [AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_ENV_KEY]: AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_VALUE,
      },
      mkdir: vi.fn().mockResolvedValue(undefined) as never,
      writeFile: vi.fn().mockResolvedValue(undefined) as never,
    });

    expect(result.exitCode).toBe(1);
    expect(result.status).toBe("FAIL");
    expect(result.results).toHaveLength(3);
    expect(result.output).toContain("- status: FAIL");
    expect(commandRunner).toHaveBeenCalledTimes(3);
  });

  it("builds deterministic markdown when generatedAt is supplied", () => {
    const config = createConfig({ includeAuthLocal: false });
    const markdown = buildDetailVisualSmokeMarkdown({
      config,
      generatedAt: "2026-01-02T03:04:05.000Z",
      results: [
        {
          id: "health",
          title: "Production health endpoint",
          command: "pnpm",
          args: ["ops:check:health"],
          env: { NODE_ENV: "test" },
          required: true,
          code: 0,
          status: "PASS",
          output: "ok",
          startedAt: "2026-01-02T03:04:05.000Z",
          finishedAt: "2026-01-02T03:04:06.000Z",
          durationMs: 1000,
        },
      ],
    });

    expect(markdown).toContain("- generatedAt: 2026-01-02T03:04:05.000Z");
    expect(markdown).toContain("- status: PASS");
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

  it("records thrown command errors and continues when configured to continue", async () => {
    const config = createConfig();
    const commandRunner = vi
      .fn()
      .mockResolvedValueOnce({ code: 0, output: "health ok" })
      .mockRejectedValueOnce(new Error("spawn pnpm ENOENT"))
      .mockResolvedValueOnce({ code: 0, output: "auth local ok" });
    vi.stubEnv(AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_ENV_KEY, AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_VALUE);

    await mkdir(path.dirname(config.outputPath), { recursive: true });
    await expect(runDetailVisualSmoke(config, commandRunner)).rejects.toThrow(
      "[detail-visual-smoke] required checks failed.",
    );

    const report = await readFile(config.outputPath, "utf8");
    expect(report).toContain("- status: FAIL");
    expect(report).toContain("- public-detail-visual: FAIL");
    expect(report).toContain("Error: spawn pnpm ENOENT");
    expect(report).toContain("- auth-local-detail-visual: PASS");
    expect(commandRunner).toHaveBeenCalledTimes(3);

    await rm(path.dirname(config.outputPath), { recursive: true, force: true });
  });

  it("records thrown command errors and stops when continue-on-failure is disabled", async () => {
    const config = createConfig({ continueOnFailure: false });
    const commandRunner = vi
      .fn()
      .mockResolvedValueOnce({ code: 0, output: "health ok" })
      .mockRejectedValueOnce(new Error("public detail command failed to start"));
    vi.stubEnv(AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_ENV_KEY, AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_VALUE);

    await mkdir(path.dirname(config.outputPath), { recursive: true });
    await expect(runDetailVisualSmoke(config, commandRunner)).rejects.toThrow(
      "[detail-visual-smoke] required checks failed.",
    );

    const report = await readFile(config.outputPath, "utf8");
    expect(report).toContain("- status: FAIL");
    expect(report).toContain("- public-detail-visual: FAIL");
    expect(report).toContain("Error: public detail command failed to start");
    expect(report).not.toContain("- auth-local-detail-visual:");
    expect(commandRunner).toHaveBeenCalledTimes(2);

    await rm(path.dirname(config.outputPath), { recursive: true, force: true });
  });
});
