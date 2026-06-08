import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type HttpMethod = "GET";
export type TrafficProfile = "smoke" | "baseline" | "stress" | "spike" | "soak";

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
  serverTimings: Record<string, number>;
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
  headerP50Ms: number;
  headerP95Ms: number;
  headerP99Ms: number;
  headerMaxMs: number;
  bodyP50Ms: number;
  bodyP95Ms: number;
  bodyP99Ms: number;
  bodyMaxMs: number;
  bytesP50: number;
  serverTimingP95: string;
  goalStatus: "PASS" | "FAIL";
  goalReasons: string[];
};

type TrafficEnv = Partial<Record<string, string | undefined>>;

type TrafficRunConfig = {
  profile: TrafficProfile;
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
const HEAVY_REMOTE_ACK_VALUE = "1";
const HEAVY_REMOTE_PROFILES = new Set<TrafficProfile>(["stress", "spike", "soak"]);

type TrafficProfileDefaults = {
  durationMs: number;
  concurrency: number;
  timeoutMs: number;
  thinkMs: number;
  warmupPerTarget: number;
  maxRequests: number;
};

const TRAFFIC_PROFILE_DEFAULTS: Record<TrafficProfile, TrafficProfileDefaults> = {
  smoke: {
    durationMs: 15_000,
    concurrency: 4,
    timeoutMs: 8_000,
    thinkMs: 50,
    warmupPerTarget: 1,
    maxRequests: 120,
  },
  baseline: {
    durationMs: 60_000,
    concurrency: 8,
    timeoutMs: 8_000,
    thinkMs: 25,
    warmupPerTarget: 2,
    maxRequests: 1_200,
  },
  stress: {
    durationMs: 120_000,
    concurrency: 30,
    timeoutMs: 10_000,
    thinkMs: 0,
    warmupPerTarget: 3,
    maxRequests: 10_000,
  },
  spike: {
    durationMs: 15_000,
    concurrency: 100,
    timeoutMs: 10_000,
    thinkMs: 0,
    warmupPerTarget: 1,
    maxRequests: 5_000,
  },
  soak: {
    durationMs: 1_800_000,
    concurrency: 8,
    timeoutMs: 8_000,
    thinkMs: 100,
    warmupPerTarget: 2,
    maxRequests: 0,
  },
};

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

export function parseTrafficProfile(value: string | undefined): TrafficProfile {
  if (!value) {
    return "smoke";
  }

  const normalized = value.trim().toLowerCase();
  if (["smoke", "baseline", "stress", "spike", "soak"].includes(normalized)) {
    return normalized as TrafficProfile;
  }

  throw new Error("PERF_TRAFFIC_PROFILE must be one of smoke, baseline, stress, spike, soak.");
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

function parseServerTiming(value: string | null) {
  const timings: Record<string, number> = {};
  if (!value) {
    return timings;
  }

  for (const entry of value.split(",")) {
    const [namePart, ...attributes] = entry.trim().split(";");
    const name = namePart?.trim();
    if (!name) {
      continue;
    }

    const durationAttribute = attributes.find((attribute) =>
      attribute.trim().startsWith("dur="),
    );
    const duration = Number(durationAttribute?.trim().slice("dur=".length));
    if (Number.isFinite(duration)) {
      timings[name] = duration;
    }
  }

  return timings;
}

function formatServerTimingP95(samples: TrafficSample[]) {
  const phaseNames = [...new Set(samples.flatMap((sample) => Object.keys(sample.serverTimings)))].sort();
  if (phaseNames.length === 0) {
    return "-";
  }

  return phaseNames
    .map((phaseName) => {
      const durations = samples.map((sample) => sample.serverTimings[phaseName] ?? 0);
      return `${phaseName}=${formatMs(percentile(durations, 95))}`;
    })
    .join("; ");
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
      path: "/api/feed/guest?limit=20&perf=1",
      method: "GET",
      weight: 4,
      maxP95Ms: 700,
      maxP99Ms: 1_500,
      maxErrorRate: 0,
    },
    {
      label: "home_feed_api",
      path: "/api/home/feed?perf=1",
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
    {
      label: "static_probe",
      path: "/perf-static-baseline.txt",
      method: "GET",
      weight: 1,
      maxP95Ms: 300,
      maxP99Ms: 800,
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
      const bodyDurations = group.map((sample) => Math.max(0, sample.durationMs - sample.headerMs));
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
        headerP50Ms: percentile(headerDurations, 50),
        headerP95Ms: percentile(headerDurations, 95),
        headerP99Ms: percentile(headerDurations, 99),
        headerMaxMs: headerDurations.length > 0 ? Math.max(...headerDurations) : 0,
        bodyP50Ms: percentile(bodyDurations, 50),
        bodyP95Ms: percentile(bodyDurations, 95),
        bodyP99Ms: percentile(bodyDurations, 99),
        bodyMaxMs: bodyDurations.length > 0 ? Math.max(...bodyDurations) : 0,
        bytesP50: percentile(bytes, 50),
        serverTimingP95: formatServerTimingP95(group),
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

  if (HEAVY_REMOTE_PROFILES.has(config.profile)) {
    if (
      env.PERF_TRAFFIC_REMOTE_ACK !== REMOTE_ACK_VALUE ||
      env.PERF_TRAFFIC_ALLOW_HEAVY_REMOTE !== HEAVY_REMOTE_ACK_VALUE
    ) {
      throw new Error(
        `Remote ${config.profile} traffic run is blocked by default. Set PERF_TRAFFIC_REMOTE_ACK=${REMOTE_ACK_VALUE} and PERF_TRAFFIC_ALLOW_HEAVY_REMOTE=${HEAVY_REMOTE_ACK_VALUE} only after confirming this target can absorb heavy load.`,
      );
    }
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
  const profile = parseTrafficProfile(env.PERF_TRAFFIC_PROFILE);
  const profileDefaults = TRAFFIC_PROFILE_DEFAULTS[profile];
  const baseUrl = normalizeBaseUrl(
    env.PERF_TRAFFIC_BASE_URL ?? env.PERF_BASE_URL ?? env.OPS_BASE_URL ?? DEFAULT_BASE_URL,
  );
  const outputPath = path.resolve(
    env.PERF_TRAFFIC_OUT ?? path.join(repoRoot, "docs/reports", `traffic-load-${timestamp}.md`),
  );
  const jsonOutputPath = path.resolve(env.PERF_TRAFFIC_JSON_OUT ?? outputPath.replace(/\.md$/u, ".json"));
  const config = {
    profile,
    baseUrl,
    durationMs: parsePositiveInt(
      "PERF_TRAFFIC_DURATION_MS",
      env.PERF_TRAFFIC_DURATION_MS,
      profileDefaults.durationMs,
    ),
    concurrency: parsePositiveInt(
      "PERF_TRAFFIC_CONCURRENCY",
      env.PERF_TRAFFIC_CONCURRENCY,
      profileDefaults.concurrency,
    ),
    timeoutMs: parsePositiveInt("PERF_TRAFFIC_TIMEOUT_MS", env.PERF_TRAFFIC_TIMEOUT_MS, profileDefaults.timeoutMs),
    thinkMs: parseNonNegativeInt("PERF_TRAFFIC_THINK_MS", env.PERF_TRAFFIC_THINK_MS, profileDefaults.thinkMs),
    maxRequests: parseNonNegativeInt(
      "PERF_TRAFFIC_MAX_REQUESTS",
      env.PERF_TRAFFIC_MAX_REQUESTS,
      profileDefaults.maxRequests,
    ),
    failOnGoal: parseBooleanFlag("PERF_TRAFFIC_FAIL_ON_GOAL", env.PERF_TRAFFIC_FAIL_ON_GOAL, false),
    outputPath,
    jsonOutputPath,
    targets: filterTrafficTargets(buildDefaultTrafficTargets(), env.PERF_TRAFFIC_TARGETS),
    warmupPerTarget: parseNonNegativeInt(
      "PERF_TRAFFIC_WARMUP_PER_TARGET",
      env.PERF_TRAFFIC_WARMUP_PER_TARGET,
      profileDefaults.warmupPerTarget,
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
      serverTimings: parseServerTiming(response.headers.get("server-timing")),
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
      serverTimings: {},
    } satisfies TrafficSample;
  } finally {
    clearTimeout(timeout);
  }
}

async function runTraffic(config: TrafficRunConfig) {
  const samples: TrafficSample[] = [];
  let requestIndex = 0;
  let loadRequestCount = 0;

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

  const deadline = Date.now() + config.durationMs;

  function claimRequestIndex() {
    if (Date.now() >= deadline) {
      return null;
    }
    if (config.maxRequests > 0 && loadRequestCount >= config.maxRequests) {
      return null;
    }

    requestIndex += 1;
    loadRequestCount += 1;
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

  lines.push("# TownPet 트래픽 부하 스냅샷");
  lines.push("");
  lines.push(`- 생성 시각: ${params.generatedAt}`);
  lines.push(`- 프로파일: ${params.config.profile}`);
  lines.push(`- 기준 URL: ${params.config.baseUrl}`);
  lines.push(`- 측정 시간(ms): ${params.config.durationMs}`);
  lines.push(`- 동시성: ${params.config.concurrency}`);
  lines.push(`- 제한 시간(ms): ${params.config.timeoutMs}`);
  lines.push(`- 요청 간 대기(ms): ${params.config.thinkMs}`);
  lines.push(`- 대상별 warm-up 요청 수: ${params.config.warmupPerTarget}`);
  lines.push(
    `- 최대 요청 수: ${params.config.maxRequests === 0 ? "제한 없음" : params.config.maxRequests} (부하 구간 기준)`,
  );
  lines.push(`- 전체 요청 수: ${params.samples.length}`);
  lines.push(`- 부하 구간 요청 수: ${params.samples.filter((sample) => sample.phase === "load").length}`);
  lines.push(`- 목표 판정: ${failedGoals.length === 0 ? "통과" : "실패"}`);
  lines.push("");
  lines.push("## 부하 구간 요약(목표 판정 기준)");
  lines.push("");
  lines.push(
    "| 대상 | 경로 | 요청 수 | RPS | 상태 | 오류율 | 전체 p50 | 전체 p95 | 전체 p99 | 전체 max | 헤더 p95 | 헤더 p99 | 본문 p95 | 본문 p99 | Server-Timing p95 | 전송량 p50 | 목표 |",
  );
  lines.push(
    "| --- | --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- |",
  );

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
        formatMs(summary.headerP99Ms),
        formatMs(summary.bodyP95Ms),
        formatMs(summary.bodyP99Ms),
        summary.serverTimingP95,
        formatBytes(summary.bytesP50),
        summary.goalStatus,
      ].join(" | ") + " |",
    );
  }

  if (params.warmupSummaries.length > 0) {
    lines.push("");
    lines.push("## Warm-up 요약(목표 판정 제외)");
    lines.push("");
    lines.push("| 대상 | 요청 수 | 상태 | 전체 p50 | 전체 p95 | 전체 p99 | 헤더 p99 | 본문 p99 | max |");
    lines.push("| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |");
    for (const summary of params.warmupSummaries) {
      lines.push(
        [
          `| ${summary.label}`,
          String(summary.requests),
          summary.statuses || "-",
          formatMs(summary.p50Ms),
          formatMs(summary.p95Ms),
          formatMs(summary.p99Ms),
          formatMs(summary.headerP99Ms),
          formatMs(summary.bodyP99Ms),
          formatMs(summary.maxMs),
        ].join(" | ") + " |",
      );
    }
  }

  lines.push("");
  lines.push("## 목표 판정");
  lines.push("");
  if (failedGoals.length === 0) {
    lines.push("- 설정된 모든 경로 목표를 통과했다.");
  } else {
    for (const summary of failedGoals) {
      lines.push(`- ${summary.label}: ${summary.goalReasons.join("; ")}`);
    }
  }

  lines.push("");
  lines.push("## 원본 샘플");
  lines.push("");
  lines.push("| # | 구간 | 워커 | 대상 | 상태 | 성공 | 전체 시간 | 헤더 | 본문 | 전송량 | Server-Timing | 캐시 | Vercel ID | 오류 |");
  lines.push("| ---: | --- | ---: | --- | ---: | --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- |");
  for (const sample of params.samples) {
    const bodyMs = Math.max(0, sample.durationMs - sample.headerMs);
    lines.push(
      [
        `| ${sample.requestIndex}`,
        sample.phase,
        String(sample.workerIndex),
        sample.targetLabel,
        String(sample.status),
        sample.ok ? "예" : "아니오",
        formatMs(sample.durationMs),
        formatMs(sample.headerMs),
        formatMs(bodyMs),
        formatBytes(sample.bytes),
        Object.keys(sample.serverTimings).length > 0
          ? Object.entries(sample.serverTimings)
              .map(([name, durationMs]) => `${name}=${formatMs(durationMs)}`)
              .join("; ")
          : "-",
        sample.vercelCache || "-",
        sample.vercelId || "-",
        sample.error ? sample.error.replace(/\|/gu, "/") : "-",
      ].join(" | ") + " |",
    );
  }

  lines.push("");
  lines.push("## 비교 방법");
  lines.push("");
  lines.push("- 같은 profile, baseUrl, duration, concurrency, targets, warmup 설정으로 개선 전/후를 비교한다.");
  lines.push("- production에는 `stress`, `spike`, `soak` profile을 기본 차단한다. heavy remote run은 2단계 ACK가 필요하다.");
  lines.push("- p95/p99가 튀는 route는 `perf:api-timings`, `ops:perf:snapshot`, server-timing을 이어서 확인한다.");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const config = buildTrafficRunConfig(process.env);

  console.log(`[traffic] profile=${config.profile} baseUrl=${config.baseUrl}`);
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
