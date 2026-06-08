import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, devices, type Browser, type Page } from "@playwright/test";

type AssetProfile = "desktop" | "mobile";

type AssetTarget = {
  label: string;
  path: string;
};

type ResourceTiming = {
  name: string;
  initiatorType: string;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
  duration: number;
};

type AssetSample = {
  profile: AssetProfile;
  label: string;
  path: string;
  status: number;
  finalUrl: string;
  documentBytes: number;
  documentResponseEndMs: number;
  fcpMs: number;
  lcpMs: number;
  longTaskTotalMs: number;
  scriptCount: number;
  scriptTransferBytes: number;
  scriptEncodedBytes: number;
  stylesheetCount: number;
  stylesheetTransferBytes: number;
  fetchCount: number;
  fetchTransferBytes: number;
  fontCount: number;
  fontTransferBytes: number;
  totalTransferBytes: number;
  topScripts: Array<Pick<ResourceTiming, "name" | "transferSize" | "encodedBodySize" | "duration">>;
};

const DEFAULT_BASE_URL = "https://townpet.vercel.app";
const DEFAULT_SETTLE_MS = 1000;
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

function parseProfiles(value: string | undefined): AssetProfile[] {
  const rawProfiles = value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [
    "desktop",
    "mobile",
  ];
  const profiles: AssetProfile[] = [];
  for (const rawProfile of rawProfiles) {
    if (rawProfile !== "desktop" && rawProfile !== "mobile") {
      throw new Error(`PERF_ASSET_PROFILES supports desktop,mobile. received=${rawProfile}`);
    }
    if (!profiles.includes(rawProfile)) {
      profiles.push(rawProfile);
    }
  }
  return profiles;
}

type RouteAssetEnv = Partial<Record<string, string | undefined>>;

function buildDefaultTargets(env: RouteAssetEnv): AssetTarget[] {
  const targets: AssetTarget[] = [
    { label: "home", path: "/" },
    { label: "login", path: "/login" },
    { label: "guest_feed", path: "/feed/guest" },
    { label: "static_probe", path: "/perf-static-baseline.txt" },
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

  const extraPaths = env.PERF_ASSET_EXTRA_PATHS?.split(",")
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

export function parseAssetTargetFilter(value: string | undefined) {
  const labels = value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
  if (labels.length === 0) {
    return null;
  }
  return Array.from(new Set(labels));
}

export function filterAssetTargets(
  targets: AssetTarget[],
  targetFilterValue: string | undefined,
) {
  const labels = parseAssetTargetFilter(targetFilterValue);
  if (!labels) {
    return targets;
  }

  const targetByLabel = new Map(targets.map((target) => [target.label, target]));
  const unknownLabels = labels.filter((label) => !targetByLabel.has(label));
  if (unknownLabels.length > 0) {
    throw new Error(
      `PERF_ASSET_TARGETS contains unknown target(s): ${unknownLabels.join(", ")}. available=${targets.map((target) => target.label).join(",")}`,
    );
  }

  return labels.map((label) => targetByLabel.get(label)).filter((target): target is AssetTarget => Boolean(target));
}

export function buildAssetTargets(env: RouteAssetEnv) {
  return filterAssetTargets(buildDefaultTargets(env), env.PERF_ASSET_TARGETS);
}

async function createPage(browser: Browser, profile: AssetProfile) {
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

async function installObservers(page: Page) {
  await page.addInitScript(() => {
    window.__townpetAssetPerf = { lcp: 0, longTaskTotal: 0 };
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          window.__townpetAssetPerf = {
            ...(window.__townpetAssetPerf ?? { lcp: 0, longTaskTotal: 0 }),
            lcp: lastEntry.startTime,
          };
        }
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      window.__townpetAssetPerf = { lcp: 0, longTaskTotal: 0 };
    }

    try {
      const longTaskObserver = new PerformanceObserver((entryList) => {
        const current = window.__townpetAssetPerf ?? { lcp: 0, longTaskTotal: 0 };
        const added = entryList.getEntries().reduce((sum, entry) => sum + entry.duration, 0);
        window.__townpetAssetPerf = {
          ...current,
          longTaskTotal: current.longTaskTotal + added,
        };
      });
      longTaskObserver.observe({ type: "longtask", buffered: true });
    } catch {
      window.__townpetAssetPerf = window.__townpetAssetPerf ?? { lcp: 0, longTaskTotal: 0 };
    }
  });
}

declare global {
  interface Window {
    __townpetAssetPerf?: {
      lcp: number;
      longTaskTotal: number;
    };
  }
}

function sumTransfer(resources: ResourceTiming[], initiatorTypes: string[]) {
  return resources
    .filter((resource) => initiatorTypes.includes(resource.initiatorType))
    .reduce((sum, resource) => sum + resource.transferSize, 0);
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }
  if (value >= 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(2)} MB`;
  }
  return `${Math.round(value / 1024)} KB`;
}

function formatMs(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }
  return `${Math.round(value)}ms`;
}

function compactUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}`;
  } catch {
    return value;
  }
}

async function measureRoute(params: {
  browser: Browser;
  baseUrl: string;
  profile: AssetProfile;
  target: AssetTarget;
  settleMs: number;
}) {
  const page = await createPage(params.browser, params.profile);
  await installObservers(page);
  const response = await page.goto(`${params.baseUrl}${params.target.path}`, {
    waitUntil: "load",
    timeout: 30_000,
  });
  const documentBytes = response ? (await response.body()).byteLength : 0;
  if (params.settleMs > 0) {
    await page.waitForTimeout(params.settleMs);
  }

  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const paints = performance.getEntriesByType("paint");
    const fcp = paints.find((entry) => entry.name === "first-contentful-paint")?.startTime ?? 0;
    const resources = performance.getEntriesByType("resource").map((entry) => {
      const resource = entry as PerformanceResourceTiming;
      return {
        name: resource.name,
        initiatorType: resource.initiatorType,
        transferSize: resource.transferSize ?? 0,
        encodedBodySize: resource.encodedBodySize ?? 0,
        decodedBodySize: resource.decodedBodySize ?? 0,
        duration: resource.duration ?? 0,
      };
    });

    return {
      documentResponseEndMs: navigation?.responseEnd ?? 0,
      fcpMs: fcp,
      lcpMs: window.__townpetAssetPerf?.lcp ?? 0,
      longTaskTotalMs: window.__townpetAssetPerf?.longTaskTotal ?? 0,
      resources,
    };
  });

  const resources = metrics.resources;
  const scripts = resources.filter((resource) => resource.initiatorType === "script");
  const stylesheets = resources.filter((resource) => resource.initiatorType === "link" || resource.initiatorType === "css");
  const fetches = resources.filter((resource) =>
    ["fetch", "xmlhttprequest"].includes(resource.initiatorType),
  );
  const fonts = resources.filter((resource) => resource.initiatorType === "font");
  const sample: AssetSample = {
    profile: params.profile,
    label: params.target.label,
    path: params.target.path,
    status: response?.status() ?? 0,
    finalUrl: page.url(),
    documentBytes,
    documentResponseEndMs: metrics.documentResponseEndMs,
    fcpMs: metrics.fcpMs,
    lcpMs: metrics.lcpMs,
    longTaskTotalMs: metrics.longTaskTotalMs,
    scriptCount: scripts.length,
    scriptTransferBytes: sumTransfer(resources, ["script"]),
    scriptEncodedBytes: scripts.reduce((sum, resource) => sum + resource.encodedBodySize, 0),
    stylesheetCount: stylesheets.length,
    stylesheetTransferBytes: stylesheets.reduce((sum, resource) => sum + resource.transferSize, 0),
    fetchCount: fetches.length,
    fetchTransferBytes: fetches.reduce((sum, resource) => sum + resource.transferSize, 0),
    fontCount: fonts.length,
    fontTransferBytes: fonts.reduce((sum, resource) => sum + resource.transferSize, 0),
    totalTransferBytes: resources.reduce((sum, resource) => sum + resource.transferSize, 0),
    topScripts: scripts
      .toSorted((left, right) => right.transferSize - left.transferSize)
      .slice(0, 8)
      .map((resource) => ({
        name: compactUrl(resource.name),
        transferSize: resource.transferSize,
        encodedBodySize: resource.encodedBodySize,
        duration: resource.duration,
      })),
  };

  await page.close();
  return sample;
}

function renderMarkdown(params: {
  baseUrl: string;
  generatedAt: string;
  samples: AssetSample[];
}) {
  const lines = [
    "# 라우트 asset 스냅샷",
    "",
    `- 생성 시각: \`${params.generatedAt}\``,
    `- 기준 URL: \`${params.baseUrl}\``,
    "",
    "## 요약",
    "",
    "| 프로파일 | 라우트 | 상태 | 문서 응답 | 문서 크기 | FCP | LCP | long task | script 수 | script 전송 | script encoded | CSS 전송 | fetch 전송 | 전체 전송 |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];

  for (const sample of params.samples) {
    lines.push(
      `| ${sample.profile} | \`${sample.path}\` | ${sample.status} | ${formatMs(sample.documentResponseEndMs)} | ${formatBytes(sample.documentBytes)} | ${formatMs(sample.fcpMs)} | ${formatMs(sample.lcpMs)} | ${formatMs(sample.longTaskTotalMs)} | ${sample.scriptCount} | ${formatBytes(sample.scriptTransferBytes)} | ${formatBytes(sample.scriptEncodedBytes)} | ${formatBytes(sample.stylesheetTransferBytes)} | ${formatBytes(sample.fetchTransferBytes)} | ${formatBytes(sample.totalTransferBytes)} |`,
    );
  }

  lines.push("", "## 큰 script 리소스", "");
  for (const sample of params.samples) {
    lines.push(`### ${sample.profile} ${sample.path}`, "");
    if (sample.topScripts.length === 0) {
      lines.push("- 기록된 script 리소스가 없다.", "");
      continue;
    }
    lines.push("| script | 전송량 | encoded | duration |", "| --- | ---: | ---: | ---: |");
    for (const script of sample.topScripts) {
      lines.push(
        `| \`${script.name}\` | ${formatBytes(script.transferSize)} | ${formatBytes(script.encodedBodySize)} | ${formatMs(script.duration)} |`,
      );
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const baseUrl = normalizeBaseUrl(process.env.PERF_BASE_URL ?? DEFAULT_BASE_URL);
  const settleMs = parseNonNegativeInt("PERF_ASSET_SETTLE_MS", process.env.PERF_ASSET_SETTLE_MS, DEFAULT_SETTLE_MS);
  const profiles = parseProfiles(process.env.PERF_ASSET_PROFILES);
  const targets = buildAssetTargets(process.env);
  const generatedAt = new Date().toISOString();
  const timestamp = compactTimestamp(new Date(generatedAt));
  const repoRoot = resolveRepoRoot();
  const outDir = path.join(repoRoot, "docs", "reports");
  const mdOut = process.env.PERF_ASSET_OUT
    ? path.resolve(process.env.PERF_ASSET_OUT)
    : path.join(outDir, `performance-route-assets-${timestamp}.md`);
  const jsonOut = process.env.PERF_ASSET_JSON_OUT
    ? path.resolve(process.env.PERF_ASSET_JSON_OUT)
    : path.join(outDir, `performance-route-assets-${timestamp}.json`);

  await mkdir(path.dirname(mdOut), { recursive: true });
  await mkdir(path.dirname(jsonOut), { recursive: true });

  const browser = await chromium.launch();
  try {
    const samples: AssetSample[] = [];
    for (const profile of profiles) {
      for (const target of targets) {
        samples.push(await measureRoute({ browser, baseUrl, profile, target, settleMs }));
      }
    }

    await writeFile(jsonOut, `${JSON.stringify({ generatedAt, baseUrl, samples }, null, 2)}\n`, "utf8");
    await writeFile(mdOut, renderMarkdown({ generatedAt, baseUrl, samples }), "utf8");

    console.log(`Wrote ${path.relative(repoRoot, mdOut)}`);
    console.log(`Wrote ${path.relative(repoRoot, jsonOut)}`);
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === CURRENT_FILE_PATH) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
