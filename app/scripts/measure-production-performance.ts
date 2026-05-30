import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";

type MeasurementTarget = {
  label: string;
  path: string;
  method: "GET";
};

type MeasurementSample = {
  label: string;
  path: string;
  index: number;
  status: number;
  redirected: boolean;
  finalUrl: string;
  headerMs: number;
  totalMs: number;
  bytes: number;
  contentType: string;
  vercelCache: string;
  vercelId: string;
  cacheControl: string;
  age: string;
};

type MeasurementSummary = {
  label: string;
  path: string;
  count: number;
  statusSummary: string;
  redirectedCount: number;
  bytesP50: number;
  headerMsAvg: number;
  headerMsP50: number;
  headerMsP95: number;
  totalMsAvg: number;
  totalMsP50: number;
  totalMsP95: number;
  totalMsMin: number;
  totalMsMax: number;
  firstTotalMs: number;
  warmTotalMsP50: number;
  warmTotalMsP95: number;
  slowCount: number;
};

const DEFAULT_BASE_URL = "https://townpet.vercel.app";
const DEFAULT_SAMPLE_COUNT = 7;
const DEFAULT_PAUSE_MS = 150;
const DEFAULT_SLOW_THRESHOLD_MS = 1_000;

function resolveRepoRoot() {
  return path.basename(process.cwd()) === "app" ? path.resolve(process.cwd(), "..") : process.cwd();
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function compactTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
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

function parseBooleanFlag(value: string | undefined, fallback: boolean) {
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
  throw new Error(`boolean-like value expected. received=${value}`);
}

function percentile(values: number[], p: number) {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function formatMs(value: number) {
  return `${Math.round(value)}ms`;
}

function formatBytes(value: number) {
  return `${Math.round(value).toLocaleString()}B`;
}

function summarizeStatus(samples: MeasurementSample[]) {
  const counts = new Map<number, number>();
  for (const sample of samples) {
    counts.set(sample.status, (counts.get(sample.status) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort(([left], [right]) => left - right)
    .map(([status, count]) => `${status}x${count}`)
    .join(", ");
}

function summarizeTargets(samples: MeasurementSample[], slowThresholdMs: number) {
  const byLabel = new Map<string, MeasurementSample[]>();
  for (const sample of samples) {
    const existing = byLabel.get(sample.label) ?? [];
    existing.push(sample);
    byLabel.set(sample.label, existing);
  }

  const summaries: MeasurementSummary[] = [];
  for (const targetSamples of Array.from(byLabel.values())) {
    const ordered = [...targetSamples].sort((a, b) => a.index - b.index);
    const headerValues = ordered.map((sample) => sample.headerMs);
    const totalValues = ordered.map((sample) => sample.totalMs);
    const byteValues = ordered.map((sample) => sample.bytes);
    const warmValues = ordered.slice(1).map((sample) => sample.totalMs);
    const first = ordered[0];

    summaries.push({
      label: first.label,
      path: first.path,
      count: ordered.length,
      statusSummary: summarizeStatus(ordered),
      redirectedCount: ordered.filter((sample) => sample.redirected).length,
      bytesP50: percentile(byteValues, 50),
      headerMsAvg: average(headerValues),
      headerMsP50: percentile(headerValues, 50),
      headerMsP95: percentile(headerValues, 95),
      totalMsAvg: average(totalValues),
      totalMsP50: percentile(totalValues, 50),
      totalMsP95: percentile(totalValues, 95),
      totalMsMin: Math.min(...totalValues),
      totalMsMax: Math.max(...totalValues),
      firstTotalMs: first.totalMs,
      warmTotalMsP50: percentile(warmValues.length > 0 ? warmValues : totalValues, 50),
      warmTotalMsP95: percentile(warmValues.length > 0 ? warmValues : totalValues, 95),
      slowCount: ordered.filter((sample) => sample.totalMs >= slowThresholdMs).length,
    });
  }

  return summaries.sort((left, right) => left.label.localeCompare(right.label));
}

function buildDefaultTargets(env: NodeJS.ProcessEnv): MeasurementTarget[] {
  const targets: MeasurementTarget[] = [
    { label: "home", path: "/", method: "GET" },
    { label: "login", path: "/login", method: "GET" },
    { label: "feed", path: "/feed", method: "GET" },
    { label: "guest_feed", path: "/feed/guest", method: "GET" },
    { label: "health", path: "/api/health", method: "GET" },
    { label: "home_feed_api", path: "/api/home/feed", method: "GET" },
    { label: "guest_feed_api", path: "/api/feed/guest?limit=20", method: "GET" },
    { label: "sitemap", path: "/sitemap/0.xml", method: "GET" },
  ];

  const postPath = env.PERF_POST_PATH?.trim();
  const postId = env.PERF_POST_ID?.trim();
  if (postPath) {
    targets.push({
      label: "post_detail",
      path: postPath.startsWith("/") ? postPath : `/${postPath}`,
      method: "GET",
    });
  } else if (postId) {
    targets.push({
      label: "post_detail",
      path: `/posts/${encodeURIComponent(postId)}`,
      method: "GET",
    });
  }

  const extraPaths = env.PERF_EXTRA_PATHS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean) ?? [];
  for (let index = 0; index < extraPaths.length; index += 1) {
    const extraPath = extraPaths[index];
    targets.push({
      label: `extra_${index + 1}`,
      path: extraPath.startsWith("/") ? extraPath : `/${extraPath}`,
      method: "GET",
    });
  }

  return targets;
}

async function measureTarget(baseUrl: string, target: MeasurementTarget, index: number) {
  const url = `${baseUrl}${target.path}`;
  const startedAt = performance.now();
  const response = await fetch(url, {
    method: target.method,
    redirect: "follow",
    cache: "no-store",
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
      "cache-control": "no-cache",
      "user-agent": "TownPetPerformanceBaseline/1.0",
    },
  });
  const headerMs = performance.now() - startedAt;
  const buffer = await response.arrayBuffer();
  const totalMs = performance.now() - startedAt;

  return {
    label: target.label,
    path: target.path,
    index,
    status: response.status,
    redirected: response.redirected,
    finalUrl: response.url,
    headerMs,
    totalMs,
    bytes: buffer.byteLength,
    contentType: response.headers.get("content-type") ?? "",
    vercelCache: response.headers.get("x-vercel-cache") ?? "",
    vercelId: response.headers.get("x-vercel-id") ?? "",
    cacheControl: response.headers.get("cache-control") ?? "",
    age: response.headers.get("age") ?? "",
  } satisfies MeasurementSample;
}

function buildMarkdown(params: {
  baseUrl: string;
  generatedAt: string;
  sampleCount: number;
  pauseMs: number;
  slowThresholdMs: number;
  samples: MeasurementSample[];
  summaries: MeasurementSummary[];
}) {
  const lines: string[] = [];
  lines.push("# TownPet Performance Baseline");
  lines.push("");
  lines.push(`- generatedAt: ${params.generatedAt}`);
  lines.push(`- baseUrl: ${params.baseUrl}`);
  lines.push(`- samplesPerTarget: ${params.sampleCount}`);
  lines.push(`- pauseMs: ${params.pauseMs}`);
  lines.push(`- slowThresholdMs: ${params.slowThresholdMs}`);
  lines.push(`- note: Node fetch 기반 서버/다운로드 측정이며, 브라우저 FCP/LCP/hydration 측정은 별도 Playwright 단계에서 추가한다.`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| target | path | status | redirects | p50 header | p95 header | p50 total | p95 total | first total | warm p50 total | p50 bytes | slow |");
  lines.push("|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
  for (const summary of params.summaries) {
    lines.push(
      [
        `| ${summary.label}`,
        summary.path,
        summary.statusSummary,
        String(summary.redirectedCount),
        formatMs(summary.headerMsP50),
        formatMs(summary.headerMsP95),
        formatMs(summary.totalMsP50),
        formatMs(summary.totalMsP95),
        formatMs(summary.firstTotalMs),
        formatMs(summary.warmTotalMsP50),
        formatBytes(summary.bytesP50),
        String(summary.slowCount),
      ].join(" | ") + " |",
    );
  }
  lines.push("");
  lines.push("## Raw Samples");
  lines.push("");
  lines.push("| target | run | status | redirected | header | total | bytes | cache | age | finalUrl |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---|---:|---|");
  for (const sample of params.samples) {
    lines.push(
      [
        `| ${sample.label}`,
        String(sample.index),
        String(sample.status),
        sample.redirected ? "yes" : "no",
        formatMs(sample.headerMs),
        formatMs(sample.totalMs),
        formatBytes(sample.bytes),
        sample.vercelCache || "-",
        sample.age || "-",
        sample.finalUrl,
      ].join(" | ") + " |",
    );
  }
  lines.push("");
  lines.push("## Next Measurement");
  lines.push("");
  lines.push("- Add browser performance trace for FCP/LCP/hydration and route transition timing.");
  lines.push("- Re-run this exact baseline command after `/` shell/feed/comment optimizations.");
  lines.push("- Use the same `samplesPerTarget`, target URL set, and base URL for before/after comparison.");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const timestamp = compactTimestamp(new Date(generatedAt));
  const baseUrl = normalizeBaseUrl(process.env.PERF_BASE_URL || process.env.OPS_BASE_URL || DEFAULT_BASE_URL);
  const sampleCount = parsePositiveInt("PERF_SAMPLES", process.env.PERF_SAMPLES, DEFAULT_SAMPLE_COUNT);
  const pauseMs = parseNonNegativeInt("PERF_PAUSE_MS", process.env.PERF_PAUSE_MS, DEFAULT_PAUSE_MS);
  const slowThresholdMs = parsePositiveInt(
    "PERF_SLOW_THRESHOLD_MS",
    process.env.PERF_SLOW_THRESHOLD_MS,
    DEFAULT_SLOW_THRESHOLD_MS,
  );
  const writeJson = parseBooleanFlag(process.env.PERF_WRITE_JSON, true);
  const repoRoot = resolveRepoRoot();
  const outputPath = path.resolve(
    process.env.PERF_OUT ?? path.join(repoRoot, "docs/reports", `performance-baseline-${timestamp}.md`),
  );
  const jsonOutputPath = path.resolve(
    process.env.PERF_JSON_OUT ?? outputPath.replace(/\.md$/, ".json"),
  );
  const targets = buildDefaultTargets(process.env);
  const samples: MeasurementSample[] = [];

  console.log(`Measuring ${baseUrl}`);
  console.log(`- targets: ${targets.map((target) => `${target.label}:${target.path}`).join(", ")}`);
  console.log(`- samplesPerTarget: ${sampleCount}`);

  for (const target of targets) {
    for (let index = 1; index <= sampleCount; index += 1) {
      const sample = await measureTarget(baseUrl, target, index);
      samples.push(sample);
      console.log(
        `${target.label} run=${index} status=${sample.status} headerMs=${Math.round(sample.headerMs)} totalMs=${Math.round(sample.totalMs)} bytes=${sample.bytes}`,
      );
      if (pauseMs > 0) {
        await sleep(pauseMs);
      }
    }
  }

  const summaries = summarizeTargets(samples, slowThresholdMs);
  const markdown = buildMarkdown({
    baseUrl,
    generatedAt,
    sampleCount,
    pauseMs,
    slowThresholdMs,
    samples,
    summaries,
  });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, markdown, "utf8");

  if (writeJson) {
    await writeFile(
      jsonOutputPath,
      `${JSON.stringify({ generatedAt, baseUrl, sampleCount, pauseMs, slowThresholdMs, targets, summaries, samples }, null, 2)}\n`,
      "utf8",
    );
  }

  console.log(`Performance baseline written: ${outputPath}`);
  if (writeJson) {
    console.log(`Raw JSON written: ${jsonOutputPath}`);
  }
}

main().catch((error) => {
  console.error("Performance baseline failed");
  console.error(error);
  process.exit(1);
});
