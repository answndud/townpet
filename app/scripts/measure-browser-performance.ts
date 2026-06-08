import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, devices, type Browser, type Page } from "@playwright/test";

type BrowserTarget = {
  label: string;
  path: string;
};

type BrowserProfile = "desktop" | "mobile";

type BrowserSample = {
  profile: BrowserProfile;
  label: string;
  path: string;
  index: number;
  status: number;
  finalUrl: string;
  responseEndMs: number;
  domContentLoadedMs: number;
  loadEventMs: number;
  firstPaintMs: number;
  fcpMs: number;
  lcpMs: number;
  totalGotoMs: number;
  bodyTextLength: number;
};

type BrowserSummary = {
  profile: BrowserProfile;
  label: string;
  path: string;
  count: number;
  statusSummary: string;
  responseEndP50: number;
  fcpP50: number;
  fcpP95: number;
  lcpP50: number;
  lcpP95: number;
  loadP50: number;
  loadP95: number;
  totalGotoP50: number;
  totalGotoP95: number;
};

const DEFAULT_BASE_URL = "https://townpet.vercel.app";
const DEFAULT_SAMPLE_COUNT = 3;
const DEFAULT_SETTLE_MS = 800;
const CURRENT_FILE_PATH = fileURLToPath(import.meta.url);

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

function parseProfiles(value: string | undefined): BrowserProfile[] {
  const rawProfiles = value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [
    "desktop",
    "mobile",
  ];
  const profiles: BrowserProfile[] = [];
  for (const rawProfile of rawProfiles) {
    if (rawProfile !== "desktop" && rawProfile !== "mobile") {
      throw new Error(`PERF_BROWSER_PROFILES supports desktop,mobile. received=${rawProfile}`);
    }
    if (!profiles.includes(rawProfile)) {
      profiles.push(rawProfile);
    }
  }
  return profiles;
}

function percentile(values: number[], p: number) {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function formatMs(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }
  return `${Math.round(value)}ms`;
}

function summarizeStatus(samples: BrowserSample[]) {
  const counts = new Map<number, number>();
  for (const sample of samples) {
    counts.set(sample.status, (counts.get(sample.status) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort(([left], [right]) => left - right)
    .map(([status, count]) => `${status}x${count}`)
    .join(", ");
}

type BrowserPerformanceEnv = Partial<Record<string, string | undefined>>;

function buildDefaultTargets(env: BrowserPerformanceEnv): BrowserTarget[] {
  const targets: BrowserTarget[] = [
    { label: "home", path: "/" },
    { label: "login", path: "/login" },
    { label: "guest_feed", path: "/feed/guest" },
  ];

  const postPath = env.PERF_POST_PATH?.trim();
  const postId = env.PERF_POST_ID?.trim();
  if (postPath) {
    targets.push({
      label: "post_detail",
      path: postPath.startsWith("/") ? postPath : `/${postPath}`,
    });
  } else if (postId) {
    targets.push({
      label: "post_detail",
      path: `/posts/${encodeURIComponent(postId)}/guest`,
    });
  }

  const extraPaths = env.PERF_BROWSER_EXTRA_PATHS?.split(",")
    .map((item) => item.trim())
    .filter(Boolean) ?? [];
  for (let index = 0; index < extraPaths.length; index += 1) {
    const extraPath = extraPaths[index];
    targets.push({
      label: `extra_${index + 1}`,
      path: extraPath.startsWith("/") ? extraPath : `/${extraPath}`,
    });
  }

  return targets;
}

export function parseBrowserTargetFilter(value: string | undefined) {
  const labels = value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
  if (labels.length === 0) {
    return null;
  }
  return Array.from(new Set(labels));
}

export function filterBrowserTargets(
  targets: BrowserTarget[],
  targetFilterValue: string | undefined,
) {
  const labels = parseBrowserTargetFilter(targetFilterValue);
  if (!labels) {
    return targets;
  }

  const targetByLabel = new Map(targets.map((target) => [target.label, target]));
  const unknownLabels = labels.filter((label) => !targetByLabel.has(label));
  if (unknownLabels.length > 0) {
    throw new Error(
      `PERF_BROWSER_TARGETS contains unknown target(s): ${unknownLabels.join(", ")}. available=${targets.map((target) => target.label).join(",")}`,
    );
  }

  return labels.map((label) => targetByLabel.get(label)).filter((target): target is BrowserTarget => Boolean(target));
}

export function buildBrowserTargets(env: BrowserPerformanceEnv) {
  return filterBrowserTargets(buildDefaultTargets(env), env.PERF_BROWSER_TARGETS);
}

async function createPage(browser: Browser, profile: BrowserProfile) {
  if (profile === "mobile") {
    return browser.newPage({
      ...devices["iPhone 13"],
    });
  }

  return browser.newPage({
    viewport: { width: 1365, height: 900 },
    deviceScaleFactor: 1,
  });
}

async function installPerformanceObserver(page: Page) {
  await page.addInitScript(() => {
    window.__townpetPerf = { lcp: 0 };
    try {
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          window.__townpetPerf = { lcp: lastEntry.startTime };
        }
      });
      observer.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      window.__townpetPerf = { lcp: 0 };
    }
  });
}

declare global {
  interface Window {
    __townpetPerf?: {
      lcp: number;
    };
  }
}

async function measurePage(params: {
  browser: Browser;
  baseUrl: string;
  profile: BrowserProfile;
  target: BrowserTarget;
  index: number;
  settleMs: number;
}) {
  const page = await createPage(params.browser, params.profile);
  await installPerformanceObserver(page);
  const startedAt = performance.now();
  const response = await page.goto(`${params.baseUrl}${params.target.path}`, {
    waitUntil: "load",
    timeout: 30_000,
  });
  const totalGotoMs = performance.now() - startedAt;
  if (params.settleMs > 0) {
    await page.waitForTimeout(params.settleMs);
  }

  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const paints = performance.getEntriesByType("paint");
    const firstPaint = paints.find((entry) => entry.name === "first-paint")?.startTime ?? 0;
    const fcp = paints.find((entry) => entry.name === "first-contentful-paint")?.startTime ?? 0;

    return {
      responseEndMs: navigation?.responseEnd ?? 0,
      domContentLoadedMs: navigation?.domContentLoadedEventEnd ?? 0,
      loadEventMs: navigation?.loadEventEnd ?? 0,
      firstPaintMs: firstPaint,
      fcpMs: fcp,
      lcpMs: window.__townpetPerf?.lcp ?? 0,
      bodyTextLength: document.body?.innerText?.length ?? 0,
    };
  });

  const sample: BrowserSample = {
    profile: params.profile,
    label: params.target.label,
    path: params.target.path,
    index: params.index,
    status: response?.status() ?? 0,
    finalUrl: page.url(),
    responseEndMs: metrics.responseEndMs,
    domContentLoadedMs: metrics.domContentLoadedMs,
    loadEventMs: metrics.loadEventMs,
    firstPaintMs: metrics.firstPaintMs,
    fcpMs: metrics.fcpMs,
    lcpMs: metrics.lcpMs,
    totalGotoMs,
    bodyTextLength: metrics.bodyTextLength,
  };

  await page.close();
  return sample;
}

function summarize(samples: BrowserSample[]) {
  const groups = new Map<string, BrowserSample[]>();
  for (const sample of samples) {
    const key = `${sample.profile}:${sample.label}`;
    const existing = groups.get(key) ?? [];
    existing.push(sample);
    groups.set(key, existing);
  }

  const summaries: BrowserSummary[] = [];
  for (const groupSamples of Array.from(groups.values())) {
    const first = groupSamples[0];
    summaries.push({
      profile: first.profile,
      label: first.label,
      path: first.path,
      count: groupSamples.length,
      statusSummary: summarizeStatus(groupSamples),
      responseEndP50: percentile(groupSamples.map((sample) => sample.responseEndMs), 50),
      fcpP50: percentile(groupSamples.map((sample) => sample.fcpMs), 50),
      fcpP95: percentile(groupSamples.map((sample) => sample.fcpMs), 95),
      lcpP50: percentile(groupSamples.map((sample) => sample.lcpMs), 50),
      lcpP95: percentile(groupSamples.map((sample) => sample.lcpMs), 95),
      loadP50: percentile(groupSamples.map((sample) => sample.loadEventMs), 50),
      loadP95: percentile(groupSamples.map((sample) => sample.loadEventMs), 95),
      totalGotoP50: percentile(groupSamples.map((sample) => sample.totalGotoMs), 50),
      totalGotoP95: percentile(groupSamples.map((sample) => sample.totalGotoMs), 95),
    });
  }

  return summaries.sort((left, right) =>
    `${left.profile}:${left.label}`.localeCompare(`${right.profile}:${right.label}`),
  );
}

function buildMarkdown(params: {
  generatedAt: string;
  baseUrl: string;
  sampleCount: number;
  settleMs: number;
  profiles: BrowserProfile[];
  summaries: BrowserSummary[];
  samples: BrowserSample[];
}) {
  const lines: string[] = [];
  lines.push("# TownPet 브라우저 성능 기준선");
  lines.push("");
  lines.push(`- 생성 시각: ${params.generatedAt}`);
  lines.push(`- 기준 URL: ${params.baseUrl}`);
  lines.push(`- 대상별 샘플 수: ${params.sampleCount}`);
  lines.push(`- load 이후 대기: ${params.settleMs}ms`);
  lines.push(`- 프로파일: ${params.profiles.join(", ")}`);
  lines.push(`- 메모: Playwright Chromium 기준 브라우저 navigation/paint/LCP 측정이다.`);
  lines.push("");
  lines.push("## 요약");
  lines.push("");
  lines.push("| 프로파일 | 대상 | 경로 | 상태 | responseEnd p50 | FCP p50 | FCP p95 | LCP p50 | LCP p95 | load p50 | 총 이동 p50 |");
  lines.push("|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|");
  for (const summary of params.summaries) {
    lines.push(
      [
        `| ${summary.profile}`,
        summary.label,
        summary.path,
        summary.statusSummary,
        formatMs(summary.responseEndP50),
        formatMs(summary.fcpP50),
        formatMs(summary.fcpP95),
        formatMs(summary.lcpP50),
        formatMs(summary.lcpP95),
        formatMs(summary.loadP50),
        formatMs(summary.totalGotoP50),
      ].join(" | ") + " |",
    );
  }
  lines.push("");
  lines.push("## 원본 샘플");
  lines.push("");
  lines.push("| 프로파일 | 대상 | 실행 | 상태 | responseEnd | FCP | LCP | load | 총 이동 | 본문 길이 | 최종 URL |");
  lines.push("|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|");
  for (const sample of params.samples) {
    lines.push(
      [
        `| ${sample.profile}`,
        sample.label,
        String(sample.index),
        String(sample.status),
        formatMs(sample.responseEndMs),
        formatMs(sample.fcpMs),
        formatMs(sample.lcpMs),
        formatMs(sample.loadEventMs),
        formatMs(sample.totalGotoMs),
        String(sample.bodyTextLength),
        sample.finalUrl,
      ].join(" | ") + " |",
    );
  }
  lines.push("");

  return `${lines.join("\n")}\n`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const timestamp = compactTimestamp(new Date(generatedAt));
  const repoRoot = resolveRepoRoot();
  const baseUrl = normalizeBaseUrl(process.env.PERF_BASE_URL || process.env.OPS_BASE_URL || DEFAULT_BASE_URL);
  const sampleCount = parsePositiveInt(
    "PERF_BROWSER_SAMPLES",
    process.env.PERF_BROWSER_SAMPLES,
    DEFAULT_SAMPLE_COUNT,
  );
  const settleMs = parseNonNegativeInt(
    "PERF_BROWSER_SETTLE_MS",
    process.env.PERF_BROWSER_SETTLE_MS,
    DEFAULT_SETTLE_MS,
  );
  const profiles = parseProfiles(process.env.PERF_BROWSER_PROFILES);
  const outputPath = path.resolve(
    process.env.PERF_BROWSER_OUT ??
      path.join(repoRoot, "docs/reports", `performance-browser-baseline-${timestamp}.md`),
  );
  const jsonOutputPath = path.resolve(
    process.env.PERF_BROWSER_JSON_OUT ?? outputPath.replace(/\.md$/, ".json"),
  );
  const targets = buildBrowserTargets(process.env);
  const browser = await chromium.launch();
  const samples: BrowserSample[] = [];

  console.log(`Measuring browser performance for ${baseUrl}`);
  console.log(`- profiles: ${profiles.join(", ")}`);
  console.log(`- targets: ${targets.map((target) => `${target.label}:${target.path}`).join(", ")}`);

  try {
    for (const profile of profiles) {
      for (const target of targets) {
        for (let index = 1; index <= sampleCount; index += 1) {
          const sample = await measurePage({
            browser,
            baseUrl,
            profile,
            target,
            index,
            settleMs,
          });
          samples.push(sample);
          console.log(
            `${profile}/${target.label} run=${index} status=${sample.status} fcp=${Math.round(sample.fcpMs)} lcp=${Math.round(sample.lcpMs)} load=${Math.round(sample.loadEventMs)} total=${Math.round(sample.totalGotoMs)}`,
          );
        }
      }
    }
  } finally {
    await browser.close();
  }

  const summaries = summarize(samples);
  const markdown = buildMarkdown({
    generatedAt,
    baseUrl,
    sampleCount,
    settleMs,
    profiles,
    summaries,
    samples,
  });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, markdown, "utf8");
  await writeFile(
    jsonOutputPath,
    `${JSON.stringify({ generatedAt, baseUrl, sampleCount, settleMs, profiles, targets, summaries, samples }, null, 2)}\n`,
    "utf8",
  );

  console.log(`Browser performance baseline written: ${outputPath}`);
  console.log(`Raw JSON written: ${jsonOutputPath}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === CURRENT_FILE_PATH) {
  main().catch((error) => {
    console.error("Browser performance baseline failed");
    console.error(error);
    process.exit(1);
  });
}
