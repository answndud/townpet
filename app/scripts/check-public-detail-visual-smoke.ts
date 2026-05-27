import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";

import { chromium, devices, type Browser, type Page } from "@playwright/test";

type FeedItem = {
  id?: string;
  title?: string;
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

type PublicDetailTarget = {
  id: string;
  title: string;
  isOperatorContent: boolean;
  operatorSourceName: string | null;
};

type SmokeProfile = "desktop" | "mobile";

type SmokeResult = {
  profile: SmokeProfile;
  url: string;
  screenshot: string;
  titleVisible: boolean;
  hasCommentSection: boolean;
  hasReportEntry: boolean;
  hasOperatorSource: boolean;
  noHorizontalOverflow: boolean;
};

const DEFAULT_BASE_URL = "https://townpet.vercel.app";

function resolveRepoRoot() {
  return path.basename(process.cwd()) === "app" ? path.resolve(process.cwd(), "..") : process.cwd();
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function compactTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function extractPublicFeedItems(payload: FeedPayload): PublicDetailTarget[] {
  const items = (payload.feed ?? payload.data?.feed)?.items ?? [];
  return items
    .filter((item) => item.id && item.title)
    .map((item) => ({
      id: String(item.id),
      title: String(item.title),
      isOperatorContent: Boolean(item.isOperatorContent),
      operatorSourceName: item.operatorSourceName ?? null,
    }));
}

function selectSmokeTarget(items: PublicDetailTarget[]) {
  return items.find((item) => item.isOperatorContent) ?? items[0] ?? null;
}

async function readFeedTarget(baseUrl: string) {
  const response = await fetch(`${baseUrl}/api/feed/guest?sort=LATEST&density=ULTRA`, {
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
  return selectSmokeTarget(extractPublicFeedItems(payload));
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

async function inspectDetail(params: {
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
    const noHorizontalOverflow = await hasNoHorizontalOverflow(page);

    await mkdir(path.dirname(params.screenshotPath), { recursive: true });
    await page.screenshot({ path: params.screenshotPath, fullPage: true });

    return {
      profile: params.profile,
      url,
      screenshot: params.screenshotPath,
      titleVisible,
      hasCommentSection: bodyText.includes("댓글"),
      hasReportEntry: bodyText.includes("신고"),
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

function buildMarkdown(params: {
  generatedAt: string;
  baseUrl: string;
  target: PublicDetailTarget;
  results: SmokeResult[];
}) {
  const lines = [
    "# Public Detail Visual Smoke",
    "",
    `- generatedAt: \`${params.generatedAt}\``,
    `- baseUrl: \`${params.baseUrl}\``,
    `- target: \`${params.target.id}\``,
    `- title: ${params.target.title}`,
    `- isOperatorContent: ${String(params.target.isOperatorContent)}`,
    "",
    "## Summary",
    "",
    "| profile | title | comments | report | operator source | no overflow | screenshot |",
    "| --- | ---: | ---: | ---: | ---: | ---: | --- |",
  ];

  for (const result of params.results) {
    lines.push(
      `| ${result.profile} | ${result.titleVisible ? "PASS" : "FAIL"} | ${result.hasCommentSection ? "PASS" : "FAIL"} | ${result.hasReportEntry ? "PASS" : "FAIL"} | ${result.hasOperatorSource ? "PASS" : "FAIL"} | ${result.noHorizontalOverflow ? "PASS" : "FAIL"} | \`${path.relative(resolveRepoRoot(), result.screenshot)}\` |`,
    );
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const timestamp = compactTimestamp(new Date(generatedAt));
  const repoRoot = resolveRepoRoot();
  const baseUrl = normalizeBaseUrl(process.env.OPS_BASE_URL || DEFAULT_BASE_URL);
  const target = await readFeedTarget(baseUrl);
  if (!target) {
    throw new Error("No public guest feed item found for detail visual smoke.");
  }

  const outputDir = path.join(repoRoot, "docs/reports", `public-detail-visual-smoke-${timestamp}`);
  const browser = await chromium.launch();
  const results: SmokeResult[] = [];
  try {
    for (const profile of ["desktop", "mobile"] as const) {
      results.push(
        await inspectDetail({
          browser,
          baseUrl,
          target,
          profile,
          screenshotPath: path.join(outputDir, `${profile}.png`),
        }),
      );
    }
  } finally {
    await browser.close();
  }

  await writeFile(
    path.join(outputDir, "README.md"),
    buildMarkdown({ generatedAt, baseUrl, target, results }),
    "utf8",
  );

  console.log(`Public detail visual smoke written: ${path.relative(repoRoot, outputDir)}`);
  for (const result of results) {
    console.log(
      `${result.profile}: title=${result.titleVisible} comments=${result.hasCommentSection} report=${result.hasReportEntry} operator=${result.hasOperatorSource} overflow=${result.noHorizontalOverflow}`,
    );
  }

  if (results.some((result) => !resultPassed(result))) {
    throw new Error("Public detail visual smoke failed.");
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Public detail visual smoke failed");
    console.error(error);
    process.exit(1);
  });
}
