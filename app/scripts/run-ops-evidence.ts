import "dotenv/config";

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type CommandResult = {
  code: number;
  output: string;
};

type CommandRunner = (
  command: string,
  args: string[],
  options: { env: NodeJS.ProcessEnv },
) => Promise<CommandResult>;

type EvidenceStep = {
  id: string;
  title: string;
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  required: boolean;
};

type EvidenceStepResult = EvidenceStep & {
  code: number;
  status: "PASS" | "FAIL";
  output: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
};

export type OpsEvidenceConfig = {
  baseUrl: string;
  outputPath: string;
  perfOutputPath: string;
  perfSummaryPath: string;
  securityStrict: boolean;
  continueOnFailure: boolean;
};

const CURRENT_FILE_PATH = fileURLToPath(import.meta.url);
const DEFAULT_LOCAL_BASE_URL = "http://localhost:3000";

function hasTruthyFlag(value: string | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return ["1", "true", "yes", "y", "on"].includes(normalized);
}

function hasFalsyFlag(value: string | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return ["0", "false", "no", "n", "off"].includes(normalized);
}

function compactTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function defaultEvidencePath(timestamp: string) {
  return path.resolve(process.cwd(), "../docs/reports", `ops-evidence-${timestamp}.md`);
}

function excerptOutput(output: string, maxLines = 80) {
  const lines = output.trim().split("\n").filter(Boolean);
  if (lines.length <= maxLines) {
    return lines.join("\n");
  }

  return [...lines.slice(0, 40), "...", ...lines.slice(-40)].join("\n");
}

type EnvMap = Record<string, string | undefined>;

export function resolveOpsEvidenceConfig(env: EnvMap = process.env): OpsEvidenceConfig {
  const timestamp = compactTimestamp();
  const outputPath = path.resolve(env.OPS_EVIDENCE_OUT ?? defaultEvidencePath(timestamp));
  const perfOutputPath = path.resolve(
    env.OPS_EVIDENCE_PERF_OUT ?? outputPath.replace(/\.md$/, ".latency.tsv"),
  );
  const perfSummaryPath = path.resolve(
    env.OPS_EVIDENCE_PERF_SUMMARY_OUT ?? outputPath.replace(/\.md$/, ".latency.summary.md"),
  );

  return {
    baseUrl: env.OPS_BASE_URL?.trim() || DEFAULT_LOCAL_BASE_URL,
    outputPath,
    perfOutputPath,
    perfSummaryPath,
    securityStrict: hasTruthyFlag(env.OPS_EVIDENCE_SECURITY_STRICT),
    continueOnFailure: !hasFalsyFlag(env.OPS_EVIDENCE_CONTINUE_ON_FAILURE),
  };
}

export function buildOpsEvidenceSteps(config: OpsEvidenceConfig): EvidenceStep[] {
  const baseEnv: NodeJS.ProcessEnv = {
    ...process.env,
    OPS_BASE_URL: config.baseUrl,
  };

  return [
    {
      id: "health",
      title: "Health endpoint",
      command: "pnpm",
      args: ["ops:check:health"],
      env: baseEnv,
      required: true,
    },
    {
      id: "security-env",
      title: config.securityStrict ? "Security env strict preflight" : "Security env preflight",
      command: "pnpm",
      args: [config.securityStrict ? "ops:check:security-env:strict" : "ops:check:security-env"],
      env: baseEnv,
      required: true,
    },
    {
      id: "prewarm",
      title: "Read-only deployment prewarm",
      command: "pnpm",
      args: ["ops:prewarm"],
      env: {
        ...baseEnv,
        OPS_PREWARM_PASSES: baseEnv.OPS_PREWARM_PASSES ?? "1",
        OPS_PREWARM_PAUSE_MS: baseEnv.OPS_PREWARM_PAUSE_MS ?? "100",
      },
      required: true,
    },
    {
      id: "perf-snapshot",
      title: "Latency snapshot",
      command: "pnpm",
      args: ["ops:perf:snapshot"],
      env: {
        ...baseEnv,
        OPS_PERF_GET_SAMPLES: baseEnv.OPS_PERF_GET_SAMPLES ?? "5",
        OPS_PERF_POST_SAMPLES: baseEnv.OPS_PERF_POST_SAMPLES ?? "3",
        OPS_PERF_PAUSE_MS: baseEnv.OPS_PERF_PAUSE_MS ?? "100",
        OPS_PERF_WARMUP_SAMPLES_PER_ENDPOINT:
          baseEnv.OPS_PERF_WARMUP_SAMPLES_PER_ENDPOINT ?? "1",
        OPS_PERF_FAIL_ON_THRESHOLD_BREACH:
          baseEnv.OPS_PERF_FAIL_ON_THRESHOLD_BREACH ?? "0",
        OPS_PERF_OUT: config.perfOutputPath,
        OPS_PERF_SUMMARY_OUT: config.perfSummaryPath,
      },
      required: true,
    },
  ];
}

function runCommand(command: string, args: string[], options: { env: NodeJS.ProcessEnv }) {
  return new Promise<CommandResult>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: options.env,
      stdio: ["inherit", "pipe", "pipe"],
    });

    let output = "";
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code: code ?? 1, output });
    });
  });
}

async function runStep(step: EvidenceStep, commandRunner: CommandRunner) {
  const startedAtDate = new Date();
  const result = await commandRunner(step.command, step.args, { env: step.env });
  const finishedAtDate = new Date();

  return {
    ...step,
    code: result.code,
    status: result.code === 0 ? "PASS" : "FAIL",
    output: result.output,
    startedAt: startedAtDate.toISOString(),
    finishedAt: finishedAtDate.toISOString(),
    durationMs: finishedAtDate.getTime() - startedAtDate.getTime(),
  } satisfies EvidenceStepResult;
}

function buildEvidenceMarkdown(config: OpsEvidenceConfig, results: EvidenceStepResult[]) {
  const failedRequired = results.filter((result) => result.required && result.status === "FAIL");
  const lines: string[] = [];

  lines.push("# TownPet Ops Evidence");
  lines.push("");
  lines.push(`- generatedAt: ${new Date().toISOString()}`);
  lines.push(`- baseUrl: ${config.baseUrl}`);
  lines.push(`- status: ${failedRequired.length === 0 ? "PASS" : "FAIL"}`);
  lines.push(`- continueOnFailure: ${String(config.continueOnFailure)}`);
  lines.push(`- perfOutput: ${config.perfOutputPath}`);
  lines.push(`- perfSummary: ${config.perfSummaryPath}`);
  lines.push("");
  lines.push("## Summary");
  for (const result of results) {
    lines.push(
      `- ${result.id}: ${result.status} (code=${result.code}, durationMs=${result.durationMs})`,
    );
  }
  lines.push("");

  for (const result of results) {
    lines.push(`## ${result.title}`);
    lines.push(`- id: ${result.id}`);
    lines.push(`- command: \`${[result.command, ...result.args].join(" ")}\``);
    lines.push(`- status: ${result.status}`);
    lines.push(`- startedAt: ${result.startedAt}`);
    lines.push(`- finishedAt: ${result.finishedAt}`);
    lines.push("");
    lines.push("```text");
    lines.push(excerptOutput(result.output) || "(no output)");
    lines.push("```");
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export async function runOpsEvidence(
  config = resolveOpsEvidenceConfig(),
  commandRunner: CommandRunner = runCommand,
) {
  const steps = buildOpsEvidenceSteps(config);
  const results: EvidenceStepResult[] = [];

  for (const step of steps) {
    console.log(`[ops:evidence] running ${step.id}: ${step.command} ${step.args.join(" ")}`);
    const result = await runStep(step, commandRunner);
    results.push(result);
    if (result.status === "FAIL" && !config.continueOnFailure) {
      break;
    }
  }

  await mkdir(path.dirname(config.outputPath), { recursive: true });
  await writeFile(config.outputPath, buildEvidenceMarkdown(config, results), "utf8");

  const hasFailedRequired = results.some((result) => result.required && result.status === "FAIL");
  console.log("[ops:evidence] completed");
  console.log(`- output: ${config.outputPath}`);
  console.log(`- status: ${hasFailedRequired ? "FAIL" : "PASS"}`);

  if (hasFailedRequired) {
    throw new Error(`[ops:evidence] required checks failed. output=${config.outputPath}`);
  }

  return { outputPath: config.outputPath, results };
}

export async function main() {
  await runOpsEvidence();
}

if (process.argv[1] && path.resolve(process.argv[1]) === CURRENT_FILE_PATH) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
