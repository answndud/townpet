import "dotenv/config";

import { spawn } from "node:child_process";
import { mkdir as mkdirDefault, writeFile as writeFileDefault } from "node:fs/promises";
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

type DetailVisualSmokeRunResult = {
  outputPath: string;
  results: DetailVisualSmokeStepResult[];
  status: "PASS" | "FAIL";
  markdown: string;
};

type DetailVisualSmokeCliResult = DetailVisualSmokeRunResult & {
  exitCode: 0 | 1;
  output: string;
};

type DetailVisualSmokeDeps = {
  env?: EnvMap;
  mkdir?: typeof mkdirDefault;
  writeFile?: typeof writeFileDefault;
  logger?: Pick<Console, "log">;
  generatedAt?: string;
  throwOnFailure?: boolean;
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

function formatCommandError(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ""}`;
  }

  return String(error);
}

async function runStep(step: DetailVisualSmokeStep, commandRunner: CommandRunner) {
  const startedAtDate = new Date();
  const result = await commandRunner(step.command, step.args, { env: step.env }).catch(
    (error): CommandResult => ({
      code: 1,
      output: formatCommandError(error),
    }),
  );
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

export function buildDetailVisualSmokeMarkdown(params: {
  config: DetailVisualSmokeConfig;
  results: DetailVisualSmokeStepResult[];
  generatedAt?: string;
}) {
  const { config, results } = params;
  const failedRequired = results.filter((result) => result.required && result.status === "FAIL");
  const lines: string[] = [];

  lines.push("# Detail Visual Smoke Run");
  lines.push("");
  lines.push(`- generatedAt: ${params.generatedAt ?? new Date().toISOString()}`);
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
  deps: DetailVisualSmokeDeps = {},
) {
  validateDetailVisualSmokeConfig(config, deps.env ?? process.env);
  const steps = buildDetailVisualSmokeSteps(config);
  const results: DetailVisualSmokeStepResult[] = [];
  const logger = deps.logger ?? console;

  for (const step of steps) {
    logger.log(`[detail-visual-smoke] running ${step.id}: ${step.command} ${step.args.join(" ")}`);
    const result = await runStep(step, commandRunner);
    results.push(result);
    if (result.status === "FAIL" && !config.continueOnFailure) {
      break;
    }
  }

  const mkdir = deps.mkdir ?? mkdirDefault;
  const writeFile = deps.writeFile ?? writeFileDefault;
  const markdown = buildDetailVisualSmokeMarkdown({
    config,
    results,
    generatedAt: deps.generatedAt,
  });
  await mkdir(path.dirname(config.outputPath), { recursive: true });
  await writeFile(config.outputPath, markdown, "utf8");

  const hasFailedRequired = results.some((result) => result.required && result.status === "FAIL");
  const status = hasFailedRequired ? "FAIL" : "PASS";
  logger.log("[detail-visual-smoke] completed");
  logger.log(`- output: ${config.outputPath}`);
  logger.log(`- status: ${status}`);

  if (hasFailedRequired && deps.throwOnFailure !== false) {
    throw new Error(`[detail-visual-smoke] required checks failed. output=${config.outputPath}`);
  }

  return { outputPath: config.outputPath, results, status, markdown } satisfies DetailVisualSmokeRunResult;
}

export async function runDetailVisualSmokeCli(
  config = resolveDetailVisualSmokeConfig(),
  commandRunner: CommandRunner = runCommand,
  deps: DetailVisualSmokeDeps = {},
): Promise<DetailVisualSmokeCliResult> {
  const outputLines: string[] = [];
  const logger = deps.logger ?? {
    log: (message: string) => {
      outputLines.push(message);
    },
  };

  try {
    const result = await runDetailVisualSmoke(config, commandRunner, {
      ...deps,
      logger,
      throwOnFailure: false,
    });

    return {
      ...result,
      exitCode: result.status === "PASS" ? 0 : 1,
      output: outputLines.join("\n"),
    };
  } catch (error) {
    return {
      outputPath: config.outputPath,
      results: [],
      status: "FAIL",
      markdown: "",
      exitCode: 1,
      output: [...outputLines, formatCommandError(error)].filter(Boolean).join("\n"),
    };
  }
}

export async function main() {
  const result = await runDetailVisualSmokeCli(resolveDetailVisualSmokeConfig(), runCommand, {
    logger: console,
  });
  if (result.exitCode !== 0) {
    process.exit(result.exitCode);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === CURRENT_FILE_PATH) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
