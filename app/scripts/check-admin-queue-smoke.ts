import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";

import { chromium, type BrowserContext, type Page } from "@playwright/test";

const DEFAULT_BASE_URL = "https://townpet.vercel.app";
const SESSION_COOKIE_NAMES = [
  "townpet.session-token",
  "__Secure-townpet.session-token",
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

type AdminQueueSmokeConfig = {
  baseUrl: string;
  email: string;
  password: string;
};

type AdminQueuePageCheck = {
  id: "reports" | "corrections";
  path: string;
  status: "PASS" | "FAIL";
  url: string;
  screenshot: string;
  hasReportQueue: boolean;
  hasCorrectionQueue: boolean;
  hasExpectedSurface: boolean;
  noHorizontalOverflow: boolean;
};

function resolveRepoRoot() {
  return path.basename(process.cwd()) === "app" ? path.resolve(process.cwd(), "..") : process.cwd();
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function compactTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

type AdminQueueSmokeEnv = Record<string, string | undefined>;

function requireCredential(env: AdminQueueSmokeEnv, key: string) {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`${key} is required for authenticated admin queue smoke.`);
  }
  return value;
}

export function resolveAdminQueueSmokeConfig(
  env: AdminQueueSmokeEnv,
): AdminQueueSmokeConfig {
  return {
    baseUrl: normalizeBaseUrl(env.OPS_BASE_URL || DEFAULT_BASE_URL),
    email: requireCredential(env, "ADMIN_QUEUE_SMOKE_EMAIL"),
    password: requireCredential(env, "ADMIN_QUEUE_SMOKE_PASSWORD"),
  };
}

async function loginWithCredentials(params: {
  context: BrowserContext;
  page: Page;
  baseUrl: string;
  email: string;
  password: string;
  nextPath: string;
}) {
  await params.page.goto(`${params.baseUrl}/login?next=${encodeURIComponent(params.nextPath)}`);
  const csrfResponse = await params.context.request.get(`${params.baseUrl}/api/auth/csrf`);
  if (!csrfResponse.ok()) {
    throw new Error(`Failed to load CSRF token (${csrfResponse.status()})`);
  }

  const csrfPayload = (await csrfResponse.json()) as { csrfToken?: string };
  if (!csrfPayload.csrfToken) {
    throw new Error("CSRF token was missing from auth csrf response.");
  }

  const callbackResponse = await params.context.request.post(
    `${params.baseUrl}/api/auth/callback/credentials`,
    {
      headers: { "X-Auth-Return-Redirect": "1" },
      form: {
        email: params.email,
        password: params.password,
        csrfToken: csrfPayload.csrfToken,
        callbackUrl: params.nextPath,
        json: "true",
      },
    },
  );
  if (!callbackResponse.ok()) {
    throw new Error(`Credentials callback failed (${callbackResponse.status()})`);
  }

  const callbackBody = (await callbackResponse.json().catch(() => null)) as { url?: string } | null;
  if (callbackBody?.url?.includes("/login?error=")) {
    throw new Error(`Credentials login was rejected: ${callbackBody.url}`);
  }

  const cookies = await params.context.cookies();
  if (!cookies.some((cookie) => SESSION_COOKIE_NAMES.includes(cookie.name))) {
    throw new Error("Authenticated session cookie was not created.");
  }
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

async function inspectAdminQueuePage(params: {
  page: Page;
  baseUrl: string;
  id: "reports" | "corrections";
  path: string;
  expectedSurfaceText: string;
  screenshotPath: string;
}) {
  const url = `${params.baseUrl}${params.path}`;
  await params.page.goto(url, { waitUntil: "load", timeout: 30_000 });
  await params.page
    .getByText(params.expectedSurfaceText)
    .first()
    .waitFor({ state: "visible", timeout: 15_000 })
    .catch(() => undefined);

  const bodyText = await params.page.locator("body").innerText({ timeout: 10_000 });
  const noHorizontalOverflow = await hasNoHorizontalOverflow(params.page);

  await mkdir(path.dirname(params.screenshotPath), { recursive: true });
  await params.page.screenshot({ path: params.screenshotPath, fullPage: true });

  const result = {
    id: params.id,
    path: params.path,
    url,
    screenshot: params.screenshotPath,
    hasReportQueue: bodyText.includes("신고 큐"),
    hasCorrectionQueue: bodyText.includes("정정 큐"),
    hasExpectedSurface: bodyText.includes(params.expectedSurfaceText),
    noHorizontalOverflow,
  };

  return {
    ...result,
    status: adminQueuePagePassed(result) ? "PASS" : "FAIL",
  } satisfies AdminQueuePageCheck;
}

export function adminQueuePagePassed(
  result: Pick<
    AdminQueuePageCheck,
    "hasReportQueue" | "hasCorrectionQueue" | "hasExpectedSurface" | "noHorizontalOverflow"
  >,
) {
  return (
    result.hasReportQueue &&
    result.hasCorrectionQueue &&
    result.hasExpectedSurface &&
    result.noHorizontalOverflow
  );
}

export function buildAdminQueueSmokeMarkdown(params: {
  generatedAt: string;
  baseUrl: string;
  results: AdminQueuePageCheck[];
}) {
  const lines = [
    "# Admin Queue Smoke",
    "",
    `- generatedAt: \`${params.generatedAt}\``,
    `- baseUrl: \`${params.baseUrl}\``,
    "- auth: credential login",
    "- scope: read-only admin page rendering",
    "",
    "## Summary",
    "",
    "| page | status | report queue | correction queue | expected surface | no overflow | screenshot |",
    "| --- | ---: | ---: | ---: | ---: | ---: | --- |",
  ];

  for (const result of params.results) {
    lines.push(
      `| ${result.path} | ${result.status} | ${result.hasReportQueue ? "PASS" : "FAIL"} | ${result.hasCorrectionQueue ? "PASS" : "FAIL"} | ${result.hasExpectedSurface ? "PASS" : "FAIL"} | ${result.noHorizontalOverflow ? "PASS" : "FAIL"} | \`${path.relative(resolveRepoRoot(), result.screenshot)}\` |`,
    );
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const timestamp = compactTimestamp(new Date(generatedAt));
  const repoRoot = resolveRepoRoot();
  const config = resolveAdminQueueSmokeConfig(process.env);
  const outputDir = path.join(repoRoot, "docs/reports", `admin-queue-smoke-${timestamp}`);

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1365, height: 900 },
    deviceScaleFactor: 1,
  });

  let results: AdminQueuePageCheck[] = [];
  try {
    await loginWithCredentials({
      context: page.context(),
      page,
      baseUrl: config.baseUrl,
      email: config.email,
      password: config.password,
      nextPath: "/admin/reports",
    });

    results = [
      await inspectAdminQueuePage({
        page,
        baseUrl: config.baseUrl,
        id: "reports",
        path: "/admin/reports",
        expectedSurfaceText: "신고 우선순위 검토",
        screenshotPath: path.join(outputDir, "admin-reports.png"),
      }),
      await inspectAdminQueuePage({
        page,
        baseUrl: config.baseUrl,
        id: "corrections",
        path: "/admin/corrections",
        expectedSurfaceText: "정보 정정 요청 검토",
        screenshotPath: path.join(outputDir, "admin-corrections.png"),
      }),
    ];
  } finally {
    await page.close();
    await browser.close();
  }

  await writeFile(
    path.join(outputDir, "README.md"),
    buildAdminQueueSmokeMarkdown({
      generatedAt,
      baseUrl: config.baseUrl,
      results,
    }),
    "utf8",
  );

  console.log(`Admin queue smoke written: ${path.relative(repoRoot, outputDir)}`);
  for (const result of results) {
    console.log(
      `${result.path}: status=${result.status} reportQueue=${result.hasReportQueue} correctionQueue=${result.hasCorrectionQueue} expected=${result.hasExpectedSurface} overflow=${result.noHorizontalOverflow}`,
    );
  }

  if (results.some((result) => result.status !== "PASS")) {
    throw new Error("Admin queue smoke failed.");
  }
}

if (process.env.NODE_ENV !== "test" && require.main === module) {
  main().catch((error) => {
    console.error("Admin queue smoke failed");
    console.error(error);
    process.exit(1);
  });
}
