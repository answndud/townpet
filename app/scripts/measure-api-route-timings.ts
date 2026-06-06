import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type ApiTimingTarget = {
  label: string;
  path: string;
};

type ApiTimingSample = {
  label: string;
  path: string;
  status: number;
  durationMs: number;
  serverTimings: Record<string, number>;
};

type ApiTimingEnv = Partial<Record<string, string | undefined>>;

const DEFAULT_BASE_URL = "https://townpet.vercel.app";
const DEFAULT_SAMPLES = 5;
const DEFAULT_PAUSE_MS = 150;
const CURRENT_FILE_PATH = fileURLToPath(import.meta.url);

function buildDefaultTargets(): ApiTimingTarget[] {
  return [
    { label: "health", path: "/api/health?perf=1" },
    { label: "home_feed", path: "/api/home/feed?perf=1" },
    { label: "guest_feed", path: "/api/feed/guest?perf=1" },
  ];
}

export function parseApiTimingTargetFilter(value: string | undefined) {
  if (!value) {
    return [];
  }

  return [...new Set(value.split(",").map((label) => label.trim()).filter(Boolean))];
}

export function filterApiTimingTargets(
  targets: ApiTimingTarget[],
  targetFilterValue: string | undefined,
) {
  const requestedLabels = parseApiTimingTargetFilter(targetFilterValue);
  if (requestedLabels.length === 0) {
    return targets;
  }

  const targetByLabel = new Map(targets.map((target) => [target.label, target]));
  const unknownLabels = requestedLabels.filter((label) => !targetByLabel.has(label));
  if (unknownLabels.length > 0) {
    throw new Error(
      `PERF_API_TIMING_TARGETS contains unknown target(s): ${unknownLabels.join(", ")}. available=${targets.map((target) => target.label).join(",")}`,
    );
  }

  return requestedLabels.map((label) => targetByLabel.get(label)!);
}

export function buildApiTimingTargets(env: ApiTimingEnv) {
  return filterApiTimingTargets(buildDefaultTargets(), env.PERF_API_TIMING_TARGETS);
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function measureTarget(baseUrl: string, target: ApiTimingTarget): Promise<ApiTimingSample> {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${target.path}`, {
    cache: "no-store",
    headers: {
      "user-agent": "TownPet API timing collector",
    },
  });
  const durationMs = performance.now() - startedAt;
  await response.arrayBuffer();

  return {
    label: target.label,
    path: target.path,
    status: response.status,
    durationMs,
    serverTimings: parseServerTiming(response.headers.get("server-timing")),
  };
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))] ?? 0;
}

function formatNumber(value: number) {
  return value.toFixed(1);
}

function summarize(samples: ApiTimingSample[]) {
  const labels = [...new Set(samples.map((sample) => sample.label))];
  return labels.map((label) => {
    const group = samples.filter((sample) => sample.label === label);
    const phaseNames = [...new Set(group.flatMap((sample) => Object.keys(sample.serverTimings)))];
    return {
      label,
      path: group[0]?.path ?? "",
      statuses: [...new Set(group.map((sample) => sample.status))].join(","),
      firstMs: group[0]?.durationMs ?? 0,
      p50Ms: percentile(group.map((sample) => sample.durationMs), 50),
      p95Ms: percentile(group.map((sample) => sample.durationMs), 95),
      phases: phaseNames.map((phase) => ({
        phase,
        p50Ms: percentile(
          group.map((sample) => sample.serverTimings[phase] ?? 0),
          50,
        ),
        p95Ms: percentile(
          group.map((sample) => sample.serverTimings[phase] ?? 0),
          95,
        ),
      })),
    };
  });
}

function renderMarkdown(params: {
  baseUrl: string;
  generatedAt: string;
  samples: ApiTimingSample[];
}) {
  const rows = summarize(params.samples);
  const lines = [
    "# API Route Timing Snapshot",
    "",
    `- generatedAt: \`${params.generatedAt}\``,
    `- baseUrl: \`${params.baseUrl}\``,
    `- samples: \`${params.samples.length}\``,
    "",
    "## Summary",
    "",
    "| route | statuses | first | p50 | p95 |",
    "| --- | --- | ---: | ---: | ---: |",
  ];

  for (const row of rows) {
    lines.push(
      `| \`${row.path}\` | ${row.statuses} | ${formatNumber(row.firstMs)}ms | ${formatNumber(row.p50Ms)}ms | ${formatNumber(row.p95Ms)}ms |`,
    );
  }

  lines.push("", "## Phase Timings", "");
  for (const row of rows) {
    lines.push(`### ${row.label}`, "", "| phase | p50 | p95 |", "| --- | ---: | ---: |");
    for (const phase of row.phases) {
      lines.push(
        `| ${phase.phase} | ${formatNumber(phase.p50Ms)}ms | ${formatNumber(phase.p95Ms)}ms |`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const baseUrl = normalizeBaseUrl(process.env.PERF_BASE_URL ?? DEFAULT_BASE_URL);
  const sampleCount = parsePositiveInt("PERF_API_TIMING_SAMPLES", process.env.PERF_API_TIMING_SAMPLES, DEFAULT_SAMPLES);
  const pauseMs = parseNonNegativeInt("PERF_API_TIMING_PAUSE_MS", process.env.PERF_API_TIMING_PAUSE_MS, DEFAULT_PAUSE_MS);
  const targets = buildApiTimingTargets(process.env);
  const generatedAt = new Date().toISOString();
  const timestamp = compactTimestamp(new Date(generatedAt));
  const outputPath = path.resolve(
    process.env.PERF_API_TIMING_OUT ??
      path.join("..", "docs", "reports", `api-route-timings-${timestamp}.md`),
  );
  const samples: ApiTimingSample[] = [];

  for (let index = 0; index < sampleCount; index += 1) {
    for (const target of targets) {
      samples.push(await measureTarget(baseUrl, target));
      if (pauseMs > 0) {
        await sleep(pauseMs);
      }
    }
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, renderMarkdown({ baseUrl, generatedAt, samples }), "utf8");
  console.log(`[api-timings] wrote ${outputPath}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === CURRENT_FILE_PATH) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
