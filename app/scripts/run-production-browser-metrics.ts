import "dotenv/config";

import { mkdir as mkdirDefault, writeFile as writeFileDefault } from "node:fs/promises";
import path from "node:path";
import { spawn as spawnDefault } from "node:child_process";

type ProductionBrowserMetricsEnv = Partial<Record<string, string | undefined>>;

type ProductionBrowserMetricsConfig = {
  baseUrl: string;
  targets: string;
  profiles: string;
  samples: number;
  settleMs: number;
  browserOutputPath: string;
  browserJsonOutputPath: string;
  webVitalsEnabled: boolean;
  webVitalsDays: number;
  webVitalsLimit: number;
  webVitalsOutputPath: string;
  summaryOutputPath: string;
  maxBrowserVisits: number;
  allowHeavyRun: boolean;
};

type ProductionBrowserMetricsCommand = {
  id: "browser" | "webVitals";
  command: string;
  args: string[];
  env: Record<string, string>;
};

type CommandResult = {
  id: ProductionBrowserMetricsCommand["id"];
  code: number;
  output: string;
};

type RunProductionBrowserMetricsDeps = {
  runCommand?: (command: ProductionBrowserMetricsCommand) => Promise<CommandResult>;
  mkdir?: typeof mkdirDefault;
  writeFile?: typeof writeFileDefault;
  generatedAt?: Date;
};

const DEFAULT_BASE_URL = "https://townpet.vercel.app";
const DEFAULT_TARGETS = "home,guest_feed";
const DEFAULT_PROFILES = "mobile";
const DEFAULT_SAMPLES = 1;
const DEFAULT_SETTLE_MS = 1200;
const DEFAULT_WEB_VITALS_DAYS = 7;
const DEFAULT_WEB_VITALS_LIMIT = 1000;
const DEFAULT_MAX_BROWSER_VISITS = 6;
const HEAVY_ACK = "ALLOW_PRODUCTION_BROWSER_METRICS_HEAVY_RUN";

function compactTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, "");
}

function repoRoot() {
  return path.basename(process.cwd()) === "app" ? path.resolve(process.cwd(), "..") : process.cwd();
}

function parsePositiveInteger(name: string, value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer. received=${value}`);
  }

  return parsed;
}

function parseNonNegativeInteger(name: string, value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer. received=${value}`);
  }

  return parsed;
}

function parseList(name: string, value: string) {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (items.length === 0) {
    throw new Error(`${name} must contain at least one item`);
  }
  return Array.from(new Set(items));
}

function resolveInternalToken(env: ProductionBrowserMetricsEnv) {
  return (
    env.OPS_WEB_VITALS_INTERNAL_TOKEN?.trim() ||
    env.OPS_HEALTH_INTERNAL_TOKEN?.trim() ||
    env.HEALTH_INTERNAL_TOKEN?.trim() ||
    ""
  );
}

function resolveReportPath(envValue: string | undefined, fallbackName: string) {
  return path.resolve(envValue ?? path.join(repoRoot(), "docs", "reports", fallbackName));
}

export function resolveProductionBrowserMetricsConfig(
  env: ProductionBrowserMetricsEnv = process.env,
  generatedAt = new Date(),
): ProductionBrowserMetricsConfig {
  const timestamp = compactTimestamp(generatedAt);
  const baseUrl = normalizeBaseUrl(env.OPS_BASE_URL || env.PERF_BASE_URL || DEFAULT_BASE_URL);
  const targets = env.PROD_BROWSER_METRICS_TARGETS || DEFAULT_TARGETS;
  const profiles = env.PROD_BROWSER_METRICS_PROFILES || DEFAULT_PROFILES;
  const samples = parsePositiveInteger(
    "PROD_BROWSER_METRICS_SAMPLES",
    env.PROD_BROWSER_METRICS_SAMPLES,
    DEFAULT_SAMPLES,
  );
  const settleMs = parseNonNegativeInteger(
    "PROD_BROWSER_METRICS_SETTLE_MS",
    env.PROD_BROWSER_METRICS_SETTLE_MS,
    DEFAULT_SETTLE_MS,
  );
  const webVitalsDisabled = env.PROD_BROWSER_METRICS_WEB_VITALS === "0";
  const webVitalsEnabled = !webVitalsDisabled && Boolean(resolveInternalToken(env));
  const maxBrowserVisits = parsePositiveInteger(
    "PROD_BROWSER_METRICS_MAX_BROWSER_VISITS",
    env.PROD_BROWSER_METRICS_MAX_BROWSER_VISITS,
    DEFAULT_MAX_BROWSER_VISITS,
  );
  const allowHeavyRun = env.PROD_BROWSER_METRICS_ACK === HEAVY_ACK;

  const config: ProductionBrowserMetricsConfig = {
    baseUrl,
    targets,
    profiles,
    samples,
    settleMs,
    browserOutputPath: resolveReportPath(
      env.PROD_BROWSER_METRICS_BROWSER_OUT,
      `production-browser-light-${timestamp}.md`,
    ),
    browserJsonOutputPath: resolveReportPath(
      env.PROD_BROWSER_METRICS_BROWSER_JSON_OUT,
      `production-browser-light-${timestamp}.json`,
    ),
    webVitalsEnabled,
    webVitalsDays: parsePositiveInteger(
      "PROD_BROWSER_METRICS_WEB_VITALS_DAYS",
      env.PROD_BROWSER_METRICS_WEB_VITALS_DAYS,
      DEFAULT_WEB_VITALS_DAYS,
    ),
    webVitalsLimit: parsePositiveInteger(
      "PROD_BROWSER_METRICS_WEB_VITALS_LIMIT",
      env.PROD_BROWSER_METRICS_WEB_VITALS_LIMIT,
      DEFAULT_WEB_VITALS_LIMIT,
    ),
    webVitalsOutputPath: resolveReportPath(
      env.PROD_BROWSER_METRICS_WEB_VITALS_OUT,
      `production-web-vitals-light-${timestamp}.md`,
    ),
    summaryOutputPath: resolveReportPath(
      env.PROD_BROWSER_METRICS_SUMMARY_OUT,
      `production-browser-metrics-light-summary-${timestamp}.md`,
    ),
    maxBrowserVisits,
    allowHeavyRun,
  };

  assertLowImpactConfig(config);
  return config;
}

export function countBrowserVisits(config: Pick<ProductionBrowserMetricsConfig, "targets" | "profiles" | "samples">) {
  return parseList("PROD_BROWSER_METRICS_TARGETS", config.targets).length *
    parseList("PROD_BROWSER_METRICS_PROFILES", config.profiles).length *
    config.samples;
}

export function assertLowImpactConfig(config: ProductionBrowserMetricsConfig) {
  const browserVisits = countBrowserVisits(config);
  if (browserVisits > config.maxBrowserVisits && !config.allowHeavyRun) {
    throw new Error(
      `production browser metric run would visit ${browserVisits} pages. max=${config.maxBrowserVisits}. ` +
        `Set PROD_BROWSER_METRICS_ACK=${HEAVY_ACK} only after explicitly accepting the extra production traffic.`,
    );
  }
}

export function buildProductionBrowserMetricsCommands(
  config: ProductionBrowserMetricsConfig,
  env: ProductionBrowserMetricsEnv = process.env,
): ProductionBrowserMetricsCommand[] {
  const commands: ProductionBrowserMetricsCommand[] = [
    {
      id: "browser",
      command: "tsx",
      args: ["scripts/measure-browser-performance.ts"],
      env: {
        PERF_BASE_URL: config.baseUrl,
        PERF_BROWSER_TARGETS: config.targets,
        PERF_BROWSER_PROFILES: config.profiles,
        PERF_BROWSER_SAMPLES: String(config.samples),
        PERF_BROWSER_SETTLE_MS: String(config.settleMs),
        PERF_BROWSER_OUT: config.browserOutputPath,
        PERF_BROWSER_JSON_OUT: config.browserJsonOutputPath,
        PLAYWRIGHT_BROWSERS_PATH: env.PLAYWRIGHT_BROWSERS_PATH || ".playwright-browsers",
      },
    },
  ];

  if (config.webVitalsEnabled) {
    commands.push({
      id: "webVitals",
      command: "tsx",
      args: ["scripts/fetch-web-vitals-summary.ts"],
      env: {
        OPS_BASE_URL: config.baseUrl,
        WEB_VITALS_REPORT_DAYS: String(config.webVitalsDays),
        WEB_VITALS_REPORT_LIMIT: String(config.webVitalsLimit),
        WEB_VITALS_REPORT_OUT: config.webVitalsOutputPath,
        OPS_WEB_VITALS_INTERNAL_TOKEN: env.OPS_WEB_VITALS_INTERNAL_TOKEN || "",
        OPS_HEALTH_INTERNAL_TOKEN: env.OPS_HEALTH_INTERNAL_TOKEN || "",
        HEALTH_INTERNAL_TOKEN: env.HEALTH_INTERNAL_TOKEN || "",
      },
    });
  }

  return commands;
}

async function runCommandWithSpawn(command: ProductionBrowserMetricsCommand): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawnDefault(command.command, command.args, {
      cwd: path.join(repoRoot(), "app"),
      env: {
        ...process.env,
        ...command.env,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });
    child.on("close", (code) => {
      resolve({
        id: command.id,
        code: code ?? 1,
        output,
      });
    });
  });
}

function renderSummaryMarkdown(params: {
  generatedAt: Date;
  config: ProductionBrowserMetricsConfig;
  commands: ProductionBrowserMetricsCommand[];
  results: CommandResult[];
}) {
  const browserVisits = countBrowserVisits(params.config);
  const lines = [
    "# production 저강도 browser metric 루틴",
    "",
    `- 생성 시각: \`${params.generatedAt.toISOString()}\``,
    `- baseUrl: \`${params.config.baseUrl}\``,
    `- browser visits: \`${browserVisits}\``,
    `- targets: \`${params.config.targets}\``,
    `- profiles: \`${params.config.profiles}\``,
    `- samples: \`${params.config.samples}\``,
    `- settleMs: \`${params.config.settleMs}\``,
    `- Web Vitals summary: \`${params.config.webVitalsEnabled ? "enabled" : "skipped"}\``,
    "",
    "## 원칙",
    "",
    "- production에는 기본적으로 소수 페이지를 1회씩만 방문한다.",
    "- `stress`, `spike`, `soak` 성격의 요청은 이 루틴에서 실행하지 않는다.",
    "- local spike 결과는 병목 후보 탐색용이고, 이 루틴은 실제 배포 체감 지표 확인용이다.",
    "",
    "## 산출물",
    "",
    `- browser report: \`${params.config.browserOutputPath}\``,
    `- browser raw JSON: \`${params.config.browserJsonOutputPath}\``,
    params.config.webVitalsEnabled
      ? `- Web Vitals summary: \`${params.config.webVitalsOutputPath}\``
      : "- Web Vitals summary: `skipped - internal token not configured or disabled`",
    "",
    "## 실행 결과",
    "",
    "| step | command | code |",
    "| --- | --- | ---: |",
  ];

  for (const command of params.commands) {
    const result = params.results.find((item) => item.id === command.id);
    lines.push(`| ${command.id} | \`${[command.command, ...command.args].join(" ")}\` | ${result?.code ?? "-"} |`);
  }

  lines.push("", "## 다음 판단 기준", "");
  lines.push("- browser report에서 production mobile LCP가 예산을 넘는 route만 별도 단일 target으로 재측정한다.");
  lines.push("- Web Vitals sample이 0건이면 실제 유저 데이터가 아직 부족한 것으로 보고 synthetic browser 결과만 참고한다.");
  lines.push("- p95 outlier가 반복될 때만 route cache, server query, bundle split 작업으로 연결한다.");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

export async function runProductionBrowserMetrics(
  config = resolveProductionBrowserMetricsConfig(process.env),
  deps: RunProductionBrowserMetricsDeps = {},
) {
  const generatedAt = deps.generatedAt ?? new Date();
  const commands = buildProductionBrowserMetricsCommands(config);
  const runCommand = deps.runCommand ?? runCommandWithSpawn;
  const results: CommandResult[] = [];

  for (const command of commands) {
    const result = await runCommand(command);
    results.push(result);
    process.stdout.write(result.output);
    if (result.code !== 0) {
      throw new Error(`production browser metrics step failed: ${command.id} code=${result.code}`);
    }
  }

  const markdown = renderSummaryMarkdown({
    generatedAt,
    config,
    commands,
    results,
  });
  const mkdir = deps.mkdir ?? mkdirDefault;
  const writeFile = deps.writeFile ?? writeFileDefault;
  await mkdir(path.dirname(config.summaryOutputPath), { recursive: true });
  await writeFile(config.summaryOutputPath, markdown, "utf8");
  console.log(`Production browser metrics summary written: ${config.summaryOutputPath}`);

  return {
    config,
    commands,
    results,
    markdown,
  };
}

if (process.env.NODE_ENV !== "test" && process.argv[1]?.endsWith("run-production-browser-metrics.ts")) {
  runProductionBrowserMetrics().catch((error) => {
    console.error("Production browser metrics routine failed");
    console.error(error);
    process.exit(1);
  });
}
