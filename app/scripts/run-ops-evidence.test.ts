import { mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildOpsEvidenceSteps,
  resolveOpsEvidenceConfig,
  runOpsEvidence,
  type OpsEvidenceConfig,
} from "@/../scripts/run-ops-evidence";

function createConfig(overrides: Partial<OpsEvidenceConfig> = {}): OpsEvidenceConfig {
  const tempDir = path.join(os.tmpdir(), `townpet-ops-evidence-test-${Date.now()}`);
  const outputPath = path.join(tempDir, "evidence.md");
  return {
    baseUrl: "http://localhost:3000",
    outputPath,
    perfOutputPath: path.join(tempDir, "latency.tsv"),
    perfSummaryPath: path.join(tempDir, "latency.summary.md"),
    profile: "standard",
    securityStrict: false,
    continueOnFailure: true,
    ...overrides,
  };
}

function scriptNameFromArgs(args: string[]) {
  return args.at(-1);
}

describe("ops evidence runner", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to local base URL and non-strict security checks", () => {
    const config = resolveOpsEvidenceConfig({});
    const steps = buildOpsEvidenceSteps(config);

    expect(config.baseUrl).toBe("http://localhost:3000");
    expect(config.profile).toBe("standard");
    expect(config.securityStrict).toBe(false);
    expect(config.continueOnFailure).toBe(true);
    expect(steps.map((step) => step.id)).toEqual([
      "health",
      "security-env",
      "prewarm",
      "perf-snapshot",
    ]);
    expect(scriptNameFromArgs(steps[1].args)).toBe("ops:check:security-env");
    expect(steps[3].env.OPS_PERF_GET_SAMPLES).toBe("5");
  });

  it("supports a solo profile that only checks deployment health", () => {
    const config = resolveOpsEvidenceConfig({
      OPS_BASE_URL: "https://townpet.vercel.app",
      OPS_EVIDENCE_PROFILE: "solo",
    });
    const steps = buildOpsEvidenceSteps(config);

    expect(config.profile).toBe("solo");
    expect(config.baseUrl).toBe("https://townpet.vercel.app");
    expect(steps.map((step) => step.id)).toEqual(["health"]);
  });

  it("writes a solo evidence report with only the health check", async () => {
    const config = createConfig({ profile: "solo" });
    await mkdir(path.dirname(config.outputPath), { recursive: true });

    const commandRunner = vi.fn().mockResolvedValue({ code: 0, output: "health ok" });

    await runOpsEvidence(config, commandRunner);
    const report = await readFile(config.outputPath, "utf8");

    expect(commandRunner.mock.calls.map((call) => scriptNameFromArgs(call[1]))).toEqual([
      "ops:check:health",
    ]);
    expect(report).toContain("- profile: solo");
    expect(report).toContain("- health: PASS");
    expect(report).not.toContain("- security-env:");
    expect(report).not.toContain("- prewarm:");
    expect(report).not.toContain("- perf-snapshot:");

    await rm(path.dirname(config.outputPath), { recursive: true, force: true });
  });

  it("uses strict security preflight when explicitly requested", () => {
    const config = resolveOpsEvidenceConfig({
      OPS_BASE_URL: "https://townpet.vercel.app",
      OPS_EVIDENCE_SECURITY_STRICT: "1",
      OPS_EVIDENCE_CONTINUE_ON_FAILURE: "0",
    });
    const steps = buildOpsEvidenceSteps(config);

    expect(config.baseUrl).toBe("https://townpet.vercel.app");
    expect(config.securityStrict).toBe(true);
    expect(config.continueOnFailure).toBe(false);
    expect(scriptNameFromArgs(steps[1].args)).toBe("ops:check:security-env:strict");
  });

  it("passes latency snapshot target filters through to the perf step", () => {
    vi.stubEnv("OPS_PERF_TARGETS", "api_feed_guest");
    const config = resolveOpsEvidenceConfig({
      OPS_BASE_URL: "https://townpet.vercel.app",
    });
    const steps = buildOpsEvidenceSteps(config);

    expect(steps.find((step) => step.id === "perf-snapshot")?.env.OPS_PERF_TARGETS).toBe(
      "api_feed_guest",
    );
  });

  it("writes a passing markdown evidence report", async () => {
    const config = createConfig();
    await mkdir(path.dirname(config.outputPath), { recursive: true });

    const commandRunner = vi.fn().mockResolvedValue({ code: 0, output: "ok" });

    await runOpsEvidence(config, commandRunner);
    const report = await readFile(config.outputPath, "utf8");

    expect(commandRunner.mock.calls.map((call) => scriptNameFromArgs(call[1]))).toEqual([
      "ops:check:health",
      "ops:check:security-env",
      "ops:prewarm",
      "ops:perf:snapshot",
    ]);
    expect(report).toContain("- status: PASS");
    expect(report).toContain("- profile: standard");
    expect(report).toContain("- health: PASS");
    expect(report).toContain("- perfSummary:");

    await rm(path.dirname(config.outputPath), { recursive: true, force: true });
  });

  it("records failures and exits non-zero after completing remaining checks", async () => {
    const config = createConfig();
    await mkdir(path.dirname(config.outputPath), { recursive: true });

    const commandRunner = vi
      .fn()
      .mockResolvedValueOnce({ code: 0, output: "health ok" })
      .mockResolvedValueOnce({ code: 1, output: "missing secret" })
      .mockResolvedValueOnce({ code: 0, output: "prewarm ok" })
      .mockResolvedValueOnce({ code: 0, output: "perf ok" });

    await expect(runOpsEvidence(config, commandRunner)).rejects.toThrow(
      "[ops:evidence] required checks failed.",
    );
    const report = await readFile(config.outputPath, "utf8");

    expect(commandRunner).toHaveBeenCalledTimes(4);
    expect(report).toContain("- status: FAIL");
    expect(report).toContain("- security-env: FAIL");
    expect(report).toContain("missing secret");
    expect(report).toContain("- perf-snapshot: PASS");

    await rm(path.dirname(config.outputPath), { recursive: true, force: true });
  });

  it("records thrown command errors and continues when configured to continue", async () => {
    const config = createConfig();
    await mkdir(path.dirname(config.outputPath), { recursive: true });

    const commandRunner = vi
      .fn()
      .mockResolvedValueOnce({ code: 0, output: "health ok" })
      .mockRejectedValueOnce(new Error("spawn pnpm ENOENT"))
      .mockResolvedValueOnce({ code: 0, output: "prewarm ok" })
      .mockResolvedValueOnce({ code: 0, output: "perf ok" });

    await expect(runOpsEvidence(config, commandRunner)).rejects.toThrow(
      "[ops:evidence] required checks failed.",
    );
    const report = await readFile(config.outputPath, "utf8");

    expect(commandRunner).toHaveBeenCalledTimes(4);
    expect(report).toContain("- status: FAIL");
    expect(report).toContain("- security-env: FAIL");
    expect(report).toContain("Error: spawn pnpm ENOENT");
    expect(report).toContain("- prewarm: PASS");
    expect(report).toContain("- perf-snapshot: PASS");

    await rm(path.dirname(config.outputPath), { recursive: true, force: true });
  });

  it("records thrown command errors and stops when continue-on-failure is disabled", async () => {
    const config = createConfig({ continueOnFailure: false });
    await mkdir(path.dirname(config.outputPath), { recursive: true });

    const commandRunner = vi
      .fn()
      .mockResolvedValueOnce({ code: 0, output: "health ok" })
      .mockRejectedValueOnce(new Error("security command failed to start"));

    await expect(runOpsEvidence(config, commandRunner)).rejects.toThrow(
      "[ops:evidence] required checks failed.",
    );
    const report = await readFile(config.outputPath, "utf8");

    expect(commandRunner).toHaveBeenCalledTimes(2);
    expect(report).toContain("- status: FAIL");
    expect(report).toContain("- security-env: FAIL");
    expect(report).toContain("Error: security command failed to start");
    expect(report).not.toContain("- prewarm:");
    expect(report).not.toContain("- perf-snapshot:");

    await rm(path.dirname(config.outputPath), { recursive: true, force: true });
  });
});
