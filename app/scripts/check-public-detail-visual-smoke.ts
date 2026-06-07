import "dotenv/config";

import { mkdir, writeFile as writeFileDefault } from "node:fs/promises";
import * as path from "node:path";

import { chromium, devices, type Browser, type Page } from "@playwright/test";

type FeedItem = {
  id?: string;
  title?: string;
  type?: string;
  boardType?: string;
  isOperatorContent?: boolean;
  operatorSourceName?: string | null;
};

type FeedPayload = {
  feed?: {
    items?: FeedItem[];
  };
  data?: {
    feed?: {
      items?: FeedItem[];
    };
  };
};

export type PublicDetailTarget = {
  id: string;
  title: string;
  type: string;
  isOperatorContent: boolean;
  operatorSourceName: string | null;
};

type SmokeProfile = "desktop" | "mobile";

export type SmokeResult = {
  targetType: string;
  targetTitle: string;
  profile: SmokeProfile;
  url: string;
  screenshot: string;
  titleVisible: boolean;
  hasCommentSection: boolean;
  hasReportEntry: boolean;
  hasOperatorSource: boolean;
  noHorizontalOverflow: boolean;
};

type TargetEntry = { type: string; target: PublicDetailTarget | null };

type RunnableTargetEntry = { type: string; target: PublicDetailTarget };

type PublicDetailVisualSmokeCliResult = {
  outputDir: string;
  reportPath: string;
  targetEntries: TargetEntry[];
  results: SmokeResult[];
  output: string;
  exitCode: 0 | 1;
};

type WriteFileLike = typeof writeFileDefault;

const DEFAULT_BASE_URL = "https://townpet.vercel.app";
const DEFAULT_SMOKE_TYPES = [
  "FREE_BOARD",
  "WALK_ROUTE",
  "LOST_FOUND",
  "MARKET_LISTING",
];

function resolveRepoRoot() {
  return path.basename(process.cwd()) === "app" ? path.resolve(process.cwd(), "..") : process.cwd();
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function compactTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function parseSmokeTypes(value: string | undefined) {
  return (value?.split(",") ?? DEFAULT_SMOKE_TYPES)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function resolvePublicDetailVisualSmokeConfig(params: {
  env?: NodeJS.ProcessEnv;
  now?: Date;
  repoRoot?: string;
} = {}) {
  const env = params.env ?? process.env;
  const generatedAt = (params.now ?? new Date()).toISOString();
  const timestamp = compactTimestamp(new Date(generatedAt));
  const repoRoot = params.repoRoot ?? resolveRepoRoot();

  return {
    generatedAt,
    repoRoot,
    baseUrl: normalizeBaseUrl(env.OPS_BASE_URL || DEFAULT_BASE_URL),
    types: parseSmokeTypes(env.PUBLIC_DETAIL_SMOKE_TYPES),
    outputDir: path.join(repoRoot, "docs/reports", `public-detail-visual-smoke-${timestamp}`),
  };
}

export function extractPublicFeedItems(payload: FeedPayload): PublicDetailTarget[] {
  const items = (payload.feed ?? payload.data?.feed)?.items ?? [];
  return items
    .filter((item) => item.id && item.title)
    .map((item) => ({
      id: String(item.id),
      title: String(item.title),
      type: String(item.type ?? item.boardType ?? "UNKNOWN"),
      isOperatorContent: Boolean(item.isOperatorContent),
      operatorSourceName: item.operatorSourceName ?? null,
    }));
}

function selectSmokeTarget(items: PublicDetailTarget[], type?: string) {
  const candidates = type ? items.filter((item) => item.type === type) : items;
  return candidates.find((item) => item.isOperatorContent) ?? candidates[0] ?? null;
}

export function selectSmokeTargetsByType(items: PublicDetailTarget[], types: string[]) {
  return types.map((type) => ({
    type,
    target: selectSmokeTarget(items, type),
  }));
}

function selectFallbackSmokeTarget(items: PublicDetailTarget[]) {
  return items.find((item) => item.isOperatorContent) ?? items[0] ?? null;
}

export async function readPublicDetailFeedTargets(params: {
  baseUrl: string;
  types: string[];
  fetcher?: typeof fetch;
}) {
  const fetcher = params.fetcher ?? fetch;
  const response = await fetcher(`${params.baseUrl}/api/feed/guest?sort=LATEST&density=ULTRA`, {
    method: "GET",
    headers: {
      accept: "application/json",
      "cache-control": "no-cache",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`/api/feed/guest returned HTTP ${response.status}`);
  }

  const payload = (await response.json()) as FeedPayload;
  const items = extractPublicFeedItems(payload);
  const targetsByType = selectSmokeTargetsByType(items, params.types);
  if (targetsByType.some((item) => item.target)) {
    return targetsByType;
  }

  const fallback = selectFallbackSmokeTarget(items);
  return fallback ? [{ type: fallback.type, target: fallback }] : [];
}

async function createPage(browser: Browser, profile: SmokeProfile) {
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

async function hasNoHorizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const viewportWidth = root.clientWidth;
    const documentWidth = Math.max(root.scrollWidth, body?.scrollWidth ?? 0);
    return documentWidth <= viewportWidth + 1;
  });
}

export async function inspectPublicDetail(params: {
  browser: Browser;
  baseUrl: string;
  target: PublicDetailTarget;
  profile: SmokeProfile;
  screenshotPath: string;
}) {
  const page = await createPage(params.browser, params.profile);
  const url = `${params.baseUrl}/posts/${params.target.id}/guest`;
  try {
    await page.goto(url, {
      waitUntil: "load",
      timeout: 30_000,
    });
    await page.waitForTimeout(800);

    const bodyText = await page.locator("body").innerText({ timeout: 10_000 });
    const titleVisible = await page
      .getByRole("heading", { name: params.target.title })
      .first()
      .isVisible()
      .catch(() => false);
    let hasReportEntry = bodyText.includes("신고");
    if (!hasReportEntry) {
      const postMenu = page.locator('summary[aria-label="게시글 메뉴"]').first();
      if (await postMenu.isVisible().catch(() => false)) {
        await postMenu.click();
        hasReportEntry = await page
          .getByText(/게시글 신고|신고/)
          .first()
          .isVisible()
          .catch(() => false);
        await page
          .locator('details[open] summary[aria-label="게시글 메뉴"]')
          .first()
          .click()
          .catch(() => undefined);
      }
    }
    const noHorizontalOverflow = await hasNoHorizontalOverflow(page);

    await mkdir(path.dirname(params.screenshotPath), { recursive: true });
    await page.screenshot({ path: params.screenshotPath, fullPage: true });

    return {
      targetType: params.target.type,
      targetTitle: params.target.title,
      profile: params.profile,
      url,
      screenshot: params.screenshotPath,
      titleVisible,
      hasCommentSection: bodyText.includes("댓글"),
      hasReportEntry,
      hasOperatorSource: params.target.isOperatorContent
        ? bodyText.includes("운영자 정리") &&
          (params.target.operatorSourceName ? bodyText.includes(params.target.operatorSourceName) : true)
        : true,
      noHorizontalOverflow,
    } satisfies SmokeResult;
  } finally {
    await page.close();
  }
}

function resultPassed(result: SmokeResult) {
  return (
    result.titleVisible &&
    result.hasCommentSection &&
    result.hasReportEntry &&
    result.hasOperatorSource &&
    result.noHorizontalOverflow
  );
}

export function publicDetailSmokePassed(params: {
  targetEntries: Array<{ type: string; target: PublicDetailTarget | null }>;
  results: SmokeResult[];
}) {
  return (
    params.targetEntries.every((entry) => Boolean(entry.target)) &&
    params.results.every((result) => resultPassed(result))
  );
}

export function buildPublicDetailVisualSmokeMarkdown(params: {
  generatedAt: string;
  baseUrl: string;
  targetEntries: TargetEntry[];
  results: SmokeResult[];
}) {
  const blockedEntries = params.targetEntries.filter((entry) => !entry.target);
  const lines = [
    "# Public Detail Visual Smoke",
    "",
    `- generatedAt: \`${params.generatedAt}\``,
    `- baseUrl: \`${params.baseUrl}\``,
    `- requestedTypes: ${params.targetEntries.map((entry) => `\`${entry.type}\``).join(", ")}`,
    `- blockedTypes: ${blockedEntries.length > 0 ? blockedEntries.map((entry) => `\`${entry.type}\``).join(", ") : "none"}`,
    "",
    "## Summary",
    "",
    "| type | target | profile | title | comments | report | operator source | no overflow | screenshot |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |",
  ];

  for (const result of params.results) {
    lines.push(
      `| ${result.targetType} | ${result.targetTitle} | ${result.profile} | ${result.titleVisible ? "PASS" : "FAIL"} | ${result.hasCommentSection ? "PASS" : "FAIL"} | ${result.hasReportEntry ? "PASS" : "FAIL"} | ${result.hasOperatorSource ? "PASS" : "FAIL"} | ${result.noHorizontalOverflow ? "PASS" : "FAIL"} | \`${path.relative(resolveRepoRoot(), result.screenshot)}\` |`,
    );
  }
  for (const entry of blockedEntries) {
    lines.push(`| ${entry.type} | no public feed item | - | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | - |`);
  }

  return `${lines.join("\n")}\n`;
}

export async function runPublicDetailVisualSmoke(params: {
  env?: NodeJS.ProcessEnv;
  now?: Date;
  repoRoot?: string;
  fetcher?: typeof fetch;
  launchBrowser?: () => Promise<Browser>;
  inspectDetail?: typeof inspectPublicDetail;
  writeFile?: WriteFileLike;
} = {}): Promise<PublicDetailVisualSmokeCliResult> {
  const config = resolvePublicDetailVisualSmokeConfig(params);
  const targetEntries = await readPublicDetailFeedTargets({
    baseUrl: config.baseUrl,
    types: config.types,
    fetcher: params.fetcher,
  });
  const runnableTargets = targetEntries.filter(
    (entry): entry is RunnableTargetEntry => Boolean(entry.target),
  );
  if (runnableTargets.length === 0) {
    throw new Error("No public guest feed item found for detail visual smoke.");
  }

  const launchBrowser = params.launchBrowser ?? (() => chromium.launch());
  const inspectDetail = params.inspectDetail ?? inspectPublicDetail;
  const writeFile = params.writeFile ?? writeFileDefault;
  const browser = await launchBrowser();
  const results: SmokeResult[] = [];
  try {
    for (const entry of runnableTargets) {
      for (const profile of ["desktop", "mobile"] as const) {
        results.push(
          await inspectDetail({
            browser,
            baseUrl: config.baseUrl,
            target: entry.target,
            profile,
            screenshotPath: path.join(config.outputDir, `${entry.type}-${profile}.png`),
          }),
        );
      }
    }
  } finally {
    await browser.close();
  }

  const reportPath = path.join(config.outputDir, "README.md");
  await writeFile(
    reportPath,
    buildPublicDetailVisualSmokeMarkdown({
      generatedAt: config.generatedAt,
      baseUrl: config.baseUrl,
      targetEntries,
      results,
    }),
    "utf8",
  );

  const outputLines = [`Public detail visual smoke written: ${path.relative(config.repoRoot, config.outputDir)}`];
  for (const entry of targetEntries.filter((item) => !item.target)) {
    outputLines.push(`${entry.type}: blocked=no-public-feed-item`);
  }
  for (const result of results) {
    outputLines.push(
      `${result.targetType}/${result.profile}: title=${result.titleVisible} comments=${result.hasCommentSection} report=${result.hasReportEntry} operator=${result.hasOperatorSource} overflow=${result.noHorizontalOverflow}`,
    );
  }

  return {
    outputDir: config.outputDir,
    reportPath,
    targetEntries,
    results,
    output: outputLines.join("\n"),
    exitCode: publicDetailSmokePassed({ targetEntries, results }) ? 0 : 1,
  };
}

export async function main(params: Parameters<typeof runPublicDetailVisualSmoke>[0] = {}) {
  const result = await runPublicDetailVisualSmoke(params);
  console.log(result.output);
  if (result.exitCode !== 0) {
    throw new Error("Public detail visual smoke failed.");
  }

  return result.output;
}

if (
  process.env.NODE_ENV !== "test" &&
  process.argv[1]?.endsWith("check-public-detail-visual-smoke.ts")
) {
  main().catch((error) => {
    console.error("Public detail visual smoke failed");
    console.error(error);
    process.exit(1);
  });
}
