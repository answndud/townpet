import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type HttpMethod = "GET";

export type TrafficTarget = {
  label: string;
  path: string;
  method: HttpMethod;
  weight: number;
  maxP95Ms: number;
  maxP99Ms: number;
  maxErrorRate: number;
};

export type TrafficSample = {
  phase: "warmup" | "load";
  targetLabel: string;
  path: string;
  requestIndex: number;
  workerIndex: number;
  status: number;
  ok: boolean;
  durationMs: number;
  headerMs: number;
  bytes: number;
  error: string;
  vercelCache: string;
  vercelId: string;
};

export type TrafficSummary = {
  label: string;
  path: string;
  requests: number;
  success: number;
  failed: number;
  errorRate: number;
  rps: number;
  statuses: string;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  headerP95Ms: number;
  bytesP50: number;
  goalStatus: "PASS" | "FAIL";
  goalReasons: string[];
};

type TrafficEnv = Partial<Record<string, string | undefined>>;

type TrafficRunConfig = {
  baseUrl: string;
  durationMs: number;
  concurrency: number;
  timeoutMs: number;
  thinkMs: number;
  warmupPerTarget: number;
  maxRequests: number;
  failOnGoal: boolean;
  outputPath: string;
  jsonOutputPath: string;
  targets: TrafficTarget[];
};

const CURRENT_FILE_PATH = fileURLToPath(import.meta.url);
const DEFAULT_BASE_URL = "http://localhost:3000";
const REMOTE_ACK_VALUE = "I_UNDERSTAND";

function resolveRepoRoot() {
  return path.basename(process.cwd()) === "app" ? path.resolve(process.cwd(), "..") : process.cwd();
}

function compactTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/u, "");
}

function parsePositiveInt(name: string, value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer. received=${value}`);
  }
  return parsed;
}

function parseNonNegativeInt(name: string, value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer. received=${value}`);
  }
  return parsed;
}

function parseBooleanFlag(name: string, value: string | undefined, fallback: boolean) {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`${name} must be boolean-like. received=${value}`);
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function formatMs(value: number) {
  return `${Math.round(value)}ms`;
}

function formatRate(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatBytes(value: number) {
  return `${Math.round(value).toLocaleString()}B`;
}

export function percentile(values: number[], p: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index] ?? 0;
}

function summarizeStatuses(samples: TrafficSample[]) {
  const counts = new Map<number, number>();
  for (const sample of samples) {
    counts.set(sample.status, (counts.get(sample.status) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort(([left], [right]) => left - right)
    .map(([status, count]) => `${status}x${count}`)
    .join(", ");
}

export function buildDefaultTrafficTargets(): TrafficTarget[] {
  return [
    {
      label: "home",
      path: "/",
      method: "GET",
      weight: 2,
      maxP95Ms: 1_200,
      maxP99Ms: 2_500,
      maxErrorRate: 0,
    },
    {
      label: "guest_feed_page",
      path: "/feed/guest",
      method: "GET",
      weight: 3,
      maxP95Ms: 1_600,
      maxP99Ms: 3_200,
      maxErrorRate: 0,
    },
    {
      label: "popular_guest_feed_page",
      path: "/feed/guest?mode=BEST",
      method: "GET",
      weight: 2,
      maxP95Ms: 1_600,
      maxP99Ms: 3_200,
      maxErrorRate: 0,
    },
    {
      label: "lost_found_page",
      path: "/lost-found",
      method: "GET",
      weight: 2,
      maxP95Ms: 1_600,
      maxP99Ms: 3_200,
      maxErrorRate: 0,
    },
    {
      label: "guest_feed_api",
      path: "/api/feed/guest?limit=20",
      method: "GET",
      weight: 4,
      maxP95Ms: 700,
      maxP99Ms: 1_500,
      maxErrorRate: 0,
    },
    {
      label: "home_feed_api",
      path: "/api/home/feed",
      method: "GET",
      weight: 2,
      maxP95Ms: 700,
      maxP99Ms: 1_500,
      maxErrorRate: 0,
    },
    {
      label: "health",
      path: "/api/health",
      method: "GET",
      weight: 1,
      maxP95Ms: 500,
      maxP99Ms: 1_000,
      maxErrorRate: 0,
    },
  ];
}

export function parseTrafficTargetFilter(value: string | undefined) {
  if (!value) {
    return [];
  }

  return [...new Set(value.split(",").map((label) => label.trim()).filter(Boolean))];
}

export function filterTrafficTargets(targets: TrafficTarget[], value: string | undefined) {
  const requestedLabels = parseTrafficTargetFilter(value);
  if (requestedLabels.length === 0) {
    return targets;
  }

  const targetByLabel = new Map(targets.map((target) => [target.label, target]));
  const unknownLabels = requestedLabels.filter((label) => !targetByLabel.has(label));
  if (unknownLabels.length > 0) {
    throw new Error(
      `PERF_TRAFFIC_TARGETS contains unknown target(s): ${unknownLabels.join(", ")}. available=${targets.map((target) => target.label).join(",")}`,
    );
  }

  return requestedLabels.map((label) => targetByLabel.get(label)!);
}

export function selectWeightedTarget(targets: TrafficTarget[], randomValue = Math.random()) {
  const totalWeight = targets.reduce((sum, target) => sum + target.weight, 0);
  let cursor = randomValue * totalWeight;

  for (const target of targets) {
    cursor -= target.weight;
    if (cursor <= 0) {
      return target;
    }
  }

  return targets[targets.length - 1]!;
}

export function summarizeTraffic(
  samples: TrafficSample[],
  targets: TrafficTarget[],
  durationMs: number,
): TrafficSummary[] {
  const targetByLabel = new Map(targets.map((target) => [target.label, target]));
  const labels = [...new Set(samples.map((sample) => sample.targetLabel))];

  return labels
    .map((label) => {
      const group = samples.filter((sample) => sample.targetLabel === label);
      const target = targetByLabel.get(label);
      const durations = group.map((sample) => sample.durationMs);
      const headerDurations = group.map((sample) => sample.headerMs);
      const bytes = group.map((sample) => sample.bytes);
      const failed = group.filter((sample) => !sample.ok).length;
      const errorRate = group.length > 0 ? failed / group.length : 0;
      const p95Ms = percentile(durations, 95);
      const p99Ms = percentile(durations, 99);
      const reasons: string[] = [];

      if (!target) {
        reasons.push("target goal missing");
      } else {
        if (p95Ms > target.maxP95Ms) {
          reasons.push(`p95=${p95Ms.toFixed(1)}ms > ${target.maxP95Ms}ms`);
        }
        if (p99Ms > target.maxP99Ms) {
          reasons.push(`p99=${p99Ms.toFixed(1)}ms > ${target.maxP99Ms}ms`);
        }
        if (errorRate > target.maxErrorRate) {
          reasons.push(`error_rate=${formatRate(errorRate)} > ${formatRate(target.maxErrorRate)}`);
        }
      }

      return {
        label,
        path: target?.path ?? group[0]?.path ?? "",
        requests: group.length,
        success: group.length - failed,
        failed,
        errorRate,
        rps: group.length / Math.max(durationMs / 1000, 1),
        statuses: summarizeStatuses(group),
        p50Ms: percentile(durations, 50),
        p95Ms,
        p99Ms,
        maxMs: durations.length > 0 ? Math.max(...durations) : 0,
        headerP95Ms: percentile(headerDurations, 95),
        bytesP50: percentile(bytes, 50),
        goalStatus: reasons.length === 0 ? "PASS" : "FAIL",
        goalReasons: reasons,
      } satisfies TrafficSummary;
    })
    .sort((left, right) => left.label.localeCompare(right.label));
}

function isLocalBaseUrl(baseUrl: string) {
  try {
    const url = new URL(baseUrl);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function assertRemoteLoadSafety(config: TrafficRunConfig, env: TrafficEnv) {
  if (isLocalBaseUrl(config.baseUrl)) {
    return;
  }

  const heavyRemoteRun = config.concurrency > 6 || config.durationMs > 30_000 || config.maxRequests > 300;
  if (heavyRemoteRun && env.PERF_TRAFFIC_REMOTE_ACK !== REMOTE_ACK_VALUE) {
    throw new Error(
      `Remote traffic run is intentionally capped. Set PERF_TRAFFIC_REMOTE_ACK=${REMOTE_ACK_VALUE} after lowering risk or confirming the target can handle it.`,
    );
  }
}

export function buildTrafficRunConfig(env: TrafficEnv = process.env): TrafficRunConfig {
  const generatedAt = new Date();
  const timestamp = compactTimestamp(generatedAt);
  const repoRoot = resolveRepoRoot();
  const baseUrl = normalizeBaseUrl(
    env.PERF_TRAFFIC_BASE_URL ?? env.PERF_BASE_URL ?? env.OPS_BASE_URL ?? DEFAULT_BASE_URL,
  );
  const outputPath = path.resolve(
    env.PERF_TRAFFIC_OUT ?? path.join(repoRoot, "docs/reports", `traffic-load-${timestamp}.md`),
  );
  const jsonOutputPath = path.resolve(env.PERF_TRAFFIC_JSON_OUT ?? outputPath.replace(/\.md$/u, ".json"));
  const config = {
    baseUrl,
    durationMs: parsePositiveInt("PERF_TRAFFIC_DURATION_MS", env.PERF_TRAFFIC_DURATION_MS, 15_000),
    concurrency: parsePositiveInt("PERF_TRAFFIC_CONCURRENCY", env.PERF_TRAFFIC_CONCURRENCY, 4),
    timeoutMs: parsePositiveInt("PERF_TRAFFIC_TIMEOUT_MS", env.PERF_TRAFFIC_TIMEOUT_MS, 8_000),
    thinkMs: parseNonNegativeInt("PERF_TRAFFIC_THINK_MS", env.PERF_TRAFFIC_THINK_MS, 50),
    maxRequests: parseNonNegativeInt("PERF_TRAFFIC_MAX_REQUESTS", env.PERF_TRAFFIC_MAX_REQUESTS, 120),
    failOnGoal: parseBooleanFlag("PERF_TRAFFIC_FAIL_ON_GOAL", env.PERF_TRAFFIC_FAIL_ON_GOAL, false),
    outputPath,
    jsonOutputPath,
    targets: filterTrafficTargets(buildDefaultTrafficTargets(), env.PERF_TRAFFIC_TARGETS),
    warmupPerTarget: parseNonNegativeInt(
      "PERF_TRAFFIC_WARMUP_PER_TARGET",
      env.PERF_TRAFFIC_WARMUP_PER_TARGET,
      1,
    ),
  } satisfies TrafficRunConfig;

  assertRemoteLoadSafety(config, env);
  return config;
}

async function measureRequest(params: {
  baseUrl: string;
  target: TrafficTarget;
  requestIndex: number;
  workerIndex: number;
  timeoutMs: number;
  phase: TrafficSample["phase"];
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs);
  const startedAt = performance.now();

  try {
    const response = await fetch(`${params.baseUrl}${params.target.path}`, {
      method: params.target.method,
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.7",
        "cache-control": "no-cache",
        "user-agent": "TownPetTrafficLoad/1.0",
      },
    });
    const headerMs = performance.now() - startedAt;
    const buffer = await response.arrayBuffer();
    const durationMs = performance.now() - startedAt;

    return {
      targetLabel: params.target.label,
      phase: params.phase,
      path: params.target.path,
      requestIndex: params.requestIndex,
      workerIndex: params.workerIndex,
      status: response.status,
      ok: response.status >= 200 && response.status < 400,
      durationMs,
      headerMs,
      bytes: buffer.byteLength,
      error: "",
      vercelCache: response.headers.get("x-vercel-cache") ?? "",
      vercelId: response.headers.get("x-vercel-id") ?? "",
    } satisfies TrafficSample;
  } catch (error) {
    const durationMs = performance.now() - startedAt;
    return {
      targetLabel: params.target.label,
      phase: params.phase,
      path: params.target.path,
      requestIndex: params.requestIndex,
      workerIndex: params.workerIndex,
      status: 0,
      ok: false,
      durationMs,
      headerMs: durationMs,
      bytes: 0,
      error: error instanceof Error ? error.message : String(error),
      vercelCache: "",
      vercelId: "",
    } satisfies TrafficSample;
  } finally {
    clearTimeout(timeout);
  }
}

async function runTraffic(config: TrafficRunConfig) {
  const deadline = Date.now() + config.durationMs;
  const samples: TrafficSample[] = [];
  let requestIndex = 0;

  for (const target of config.targets) {
    for (let warmupIndex = 0; warmupIndex < config.warmupPerTarget; warmupIndex += 1) {
      requestIndex += 1;
      samples.push(
        await measureRequest({
          baseUrl: config.baseUrl,
          target,
          requestIndex,
          workerIndex: 0,
          timeoutMs: config.timeoutMs,
          phase: "warmup",
        }),
      );
    }
  }

  function claimRequestIndex() {
    if (Date.now() >= deadline) {
      return null;
    }
    if (config.maxRequests > 0 && requestIndex >= config.maxRequests) {
      return null;
    }

    requestIndex += 1;
    return requestIndex;
  }

  async function runWorker(workerIndex: number) {
    while (Date.now() < deadline) {
      const nextRequestIndex = claimRequestIndex();
      if (!nextRequestIndex) {
        return;
      }

      const target = selectWeightedTarget(config.targets);
      const sample = await measureRequest({
        baseUrl: config.baseUrl,
        target,
        requestIndex: nextRequestIndex,
        workerIndex,
        timeoutMs: config.timeoutMs,
        phase: "load",
      });
      samples.push(sample);

      if (config.thinkMs > 0) {
        await sleep(config.thinkMs);
      }
    }
  }

  await Promise.all(Array.from({ length: config.concurrency }, (_, index) => runWorker(index + 1)));
  return samples.sort((left, right) => left.requestIndex - right.requestIndex);
}

function buildMarkdown(params: {
  generatedAt: string;
  config: TrafficRunConfig;
  samples: TrafficSample[];
  summaries: TrafficSummary[];
  warmupSummaries: TrafficSummary[];
}) {
  const failedGoals = params.summaries.filter((summary) => summary.goalStatus === "FAIL");
  const lines: string[] = [];

  lines.push("# TownPet Traffic Load Snapshot");
  lines.push("");
  lines.push(`- generatedAt: ${params.generatedAt}`);
  lines.push(`- baseUrl: ${params.config.baseUrl}`);
  lines.push(`- durationMs: ${params.config.durationMs}`);
  lines.push(`- concurrency: ${params.config.concurrency}`);
  lines.push(`- timeoutMs: ${params.config.timeoutMs}`);
  lines.push(`- thinkMs: ${params.config.thinkMs}`);
  lines.push(`- warmupPerTarget: ${params.config.warmupPerTarget}`);
  lines.push(`- maxRequests: ${params.config.maxRequests === 0 ? "unlimited" : params.config.maxRequests}`);
  lines.push(`- totalRequests: ${params.samples.length}`);
  lines.push(`- loadRequests: ${params.samples.filter((sample) => sample.phase === "load").length}`);
  lines.push(`- goalStatus: ${failedGoals.length === 0 ? "PASS" : "FAIL"}`);
  lines.push("");
  lines.push("## Load Summary (goal basis)");
  lines.push("");
  lines.push("| target | path | requests | rps | status | error | p50 | p95 | p99 | max | header p95 | bytes p50 | goal |");
  lines.push("| --- | --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |");

  for (const summary of params.summaries) {
    lines.push(
      [
        `| ${summary.label}`,
        `\`${summary.path}\``,
        String(summary.requests),
        summary.rps.toFixed(2),
        summary.statuses || "-",
        formatRate(summary.errorRate),
        formatMs(summary.p50Ms),
        formatMs(summary.p95Ms),
        formatMs(summary.p99Ms),
        formatMs(summary.maxMs),
        formatMs(summary.headerP95Ms),
        formatBytes(summary.bytesP50),
        summary.goalStatus,
      ].join(" | ") + " |",
    );
  }

  if (params.warmupSummaries.length > 0) {
    lines.push("");
    lines.push("## Warm-up Summary (excluded from goal)");
    lines.push("");
    lines.push("| target | requests | status | p50 | p95 | p99 | max |");
    lines.push("| --- | ---: | --- | ---: | ---: | ---: | ---: |");
    for (const summary of params.warmupSummaries) {
      lines.push(
        [
          `| ${summary.label}`,
          String(summary.requests),
          summary.statuses || "-",
          formatMs(summary.p50Ms),
          formatMs(summary.p95Ms),
          formatMs(summary.p99Ms),
          formatMs(summary.maxMs),
        ].join(" | ") + " |",
      );
    }
  }

  lines.push("");
  lines.push("## Goal Evaluation");
  lines.push("");
  if (failedGoals.length === 0) {
    lines.push("- All configured route goals passed.");
  } else {
    for (const summary of failedGoals) {
      lines.push(`- ${summary.label}: ${summary.goalReasons.join("; ")}`);
    }
  }

  lines.push("");
  lines.push("## Raw Samples");
  lines.push("");
  lines.push("| # | phase | worker | target | status | ok | duration | header | bytes | cache | vercel id | error |");
  lines.push("| ---: | --- | ---: | --- | ---: | --- | ---: | ---: | ---: | --- | --- | --- |");
  for (const sample of params.samples) {
    lines.push(
      [
        `| ${sample.requestIndex}`,
        sample.phase,
        String(sample.workerIndex),
        sample.targetLabel,
        String(sample.status),
        sample.ok ? "yes" : "no",
        formatMs(sample.durationMs),
        formatMs(sample.headerMs),
        formatBytes(sample.bytes),
        sample.vercelCache || "-",
        sample.vercelId || "-",
        sample.error ? sample.error.replace(/\|/gu, "/") : "-",
      ].join(" | ") + " |",
    );
  }

  lines.push("");
  lines.push("## How To Compare");
  lines.push("");
  lines.push("- 같은 baseUrl, duration, concurrency, targets, warmup 설정으로 개선 전/후를 비교한다.");
  lines.push("- production에는 기본값 이상의 부하를 걸지 않는다. 큰 remote run은 별도 ACK가 필요하다.");
  lines.push("- p95/p99가 튀는 route는 `perf:api-timings`, `ops:perf:snapshot`, server-timing을 이어서 확인한다.");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const config = buildTrafficRunConfig(process.env);

  console.log(`[traffic] baseUrl=${config.baseUrl}`);
  console.log(
    `[traffic] durationMs=${config.durationMs} concurrency=${config.concurrency} warmupPerTarget=${config.warmupPerTarget} maxRequests=${config.maxRequests}`,
  );
  console.log(`[traffic] targets=${config.targets.map((target) => `${target.label}:${target.path}`).join(", ")}`);

  const samples = await runTraffic(config);
  const loadSamples = samples.filter((sample) => sample.phase === "load");
  const warmupSamples = samples.filter((sample) => sample.phase === "warmup");
  const summaries = summarizeTraffic(loadSamples, config.targets, config.durationMs);
  const warmupSummaries = summarizeTraffic(warmupSamples, config.targets, Math.max(warmupSamples.length, 1) * 1_000);
  const markdown = buildMarkdown({ generatedAt, config, samples, summaries, warmupSummaries });

  await mkdir(path.dirname(config.outputPath), { recursive: true });
  await writeFile(config.outputPath, markdown, "utf8");
  await writeFile(
    config.jsonOutputPath,
    `${JSON.stringify({ generatedAt, config, summaries, samples }, null, 2)}\n`,
    "utf8",
  );

  console.log(`[traffic] wrote ${config.outputPath}`);
  console.log(`[traffic] wrote ${config.jsonOutputPath}`);

  const failedGoals = summaries.filter((summary) => summary.goalStatus === "FAIL");
  if (config.failOnGoal && failedGoals.length > 0) {
    throw new Error(`Traffic goals failed: ${failedGoals.map((summary) => summary.label).join(", ")}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === CURRENT_FILE_PATH) {
  main().catch((error) => {
    console.error("[traffic] failed");
    console.error(error);
    process.exit(1);
  });
}
