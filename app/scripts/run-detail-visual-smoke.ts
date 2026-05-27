import "dotenv/config";

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_ENV_KEY,
  AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_VALUE,
} from "./check-auth-local-detail-visual-smoke";

type CommandResult = {
  code: number;
  output: string;
};

type CommandRunner = (
  command: string,
  args: string[],
  options: { env: NodeJS.ProcessEnv },
) => Promise<CommandResult>;

type DetailVisualSmokeStep = {
  id: string;
  title: string;
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  required: boolean;
};

type DetailVisualSmokeStepResult = DetailVisualSmokeStep & {
  code: number;
  status: "PASS" | "FAIL";
  output: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
};

export type DetailVisualSmokeConfig = {
  baseUrl: string;
  outputPath: string;
  includeAuthLocal: boolean;
  continueOnFailure: boolean;
};

const CURRENT_FILE_PATH = fileURLToPath(import.meta.url);
const DEFAULT_BASE_URL = "https://townpet.vercel.app";

type EnvMap = Record<string, string | undefined>;

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

function defaultOutputPath(timestamp: string) {
  return path.resolve(process.cwd(), "../docs/reports", `detail-visual-smoke-${timestamp}.md`);
}

function excerptOutput(output: string, maxLines = 80) {
  const lines = output.trim().split("\n").filter(Boolean);
  if (lines.length <= maxLines) {
    return lines.join("\n");
  }

  return [...lines.slice(0, 40), "...", ...lines.slice(-40)].join("\n");
}

function buildPnpmCommand(script: string) {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath) {
    return {
      command: process.execPath,
      args: [npmExecPath, script],
    };
  }

  return {
    command: "pnpm",
    args: [script],
  };
}

export function resolveDetailVisualSmokeConfig(
  env: EnvMap = process.env,
): DetailVisualSmokeConfig {
  const timestamp = compactTimestamp();
  return {
    baseUrl: env.OPS_BASE_URL?.trim() || DEFAULT_BASE_URL,
    outputPath: path.resolve(env.DETAIL_VISUAL_SMOKE_OUT ?? defaultOutputPath(timestamp)),
    includeAuthLocal: !hasTruthyFlag(env.DETAIL_VISUAL_SMOKE_SKIP_AUTH_LOCAL),
    continueOnFailure: !hasFalsyFlag(env.DETAIL_VISUAL_SMOKE_CONTINUE_ON_FAILURE),
  };
}

export function validateDetailVisualSmokeConfig(
  config: DetailVisualSmokeConfig,
  env: EnvMap = process.env,
) {
  if (
    config.includeAuthLocal &&
    env[AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_ENV_KEY] !== AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_VALUE
  ) {
    throw new Error(
      `${AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_ENV_KEY}=${AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_VALUE} is required unless DETAIL_VISUAL_SMOKE_SKIP_AUTH_LOCAL=1.`,
    );
  }
}

export function buildDetailVisualSmokeSteps(
  config: DetailVisualSmokeConfig,
): DetailVisualSmokeStep[] {
  const baseEnv: NodeJS.ProcessEnv = {
    ...process.env,
    OPS_BASE_URL: config.baseUrl,
  };

  const steps: DetailVisualSmokeStep[] = [
    {
      id: "health",
      title: "Production health endpoint",
      ...buildPnpmCommand("ops:check:health"),
      env: baseEnv,
      required: true,
    },
    {
      id: "public-detail-visual",
      title: "Public guest detail visual smoke",
      ...buildPnpmCommand("ops:check:public-detail-visual"),
      env: baseEnv,
      required: true,
    },
  ];

  if (config.includeAuthLocal) {
    steps.push({
      id: "auth-local-detail-visual",
      title: "Authenticated/local detail visual smoke",
      ...buildPnpmCommand("ops:check:auth-local-detail-visual"),
      env: baseEnv,
      required: true,
    });
  }

  return steps;
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

async function runStep(step: DetailVisualSmokeStep, commandRunner: CommandRunner) {
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
  } satisfies DetailVisualSmokeStepResult;
}

function buildMarkdown(config: DetailVisualSmokeConfig, results: DetailVisualSmokeStepResult[]) {
  const failedRequired = results.filter((result) => result.required && result.status === "FAIL");
  const lines: string[] = [];

  lines.push("# Detail Visual Smoke Run");
  lines.push("");
  lines.push(`- generatedAt: ${new Date().toISOString()}`);
  lines.push(`- baseUrl: ${config.baseUrl}`);
  lines.push(`- status: ${failedRequired.length === 0 ? "PASS" : "FAIL"}`);
  lines.push(`- includeAuthLocal: ${String(config.includeAuthLocal)}`);
  lines.push(`- continueOnFailure: ${String(config.continueOnFailure)}`);
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

  return `${lines.join("\n").trimEnd()}\n`;
}

export async function runDetailVisualSmoke(
  config = resolveDetailVisualSmokeConfig(),
  commandRunner: CommandRunner = runCommand,
) {
  validateDetailVisualSmokeConfig(config);
  const steps = buildDetailVisualSmokeSteps(config);
  const results: DetailVisualSmokeStepResult[] = [];

  for (const step of steps) {
    console.log(`[detail-visual-smoke] running ${step.id}: ${step.command} ${step.args.join(" ")}`);
    const result = await runStep(step, commandRunner);
    results.push(result);
    if (result.status === "FAIL" && !config.continueOnFailure) {
      break;
    }
  }

  await mkdir(path.dirname(config.outputPath), { recursive: true });
  await writeFile(config.outputPath, buildMarkdown(config, results), "utf8");

  const hasFailedRequired = results.some((result) => result.required && result.status === "FAIL");
  console.log("[detail-visual-smoke] completed");
  console.log(`- output: ${config.outputPath}`);
  console.log(`- status: ${hasFailedRequired ? "FAIL" : "PASS"}`);

  if (hasFailedRequired) {
    throw new Error(`[detail-visual-smoke] required checks failed. output=${config.outputPath}`);
  }

  return { outputPath: config.outputPath, results };
}

export async function main() {
  await runDetailVisualSmoke();
}

if (process.argv[1] && path.resolve(process.argv[1]) === CURRENT_FILE_PATH) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
