import "dotenv/config";

import { randomUUID } from "node:crypto";
import { mkdir as mkdirDefault, writeFile as writeFileDefault } from "node:fs/promises";
import * as path from "node:path";

import { chromium, type BrowserContext, type Page } from "@playwright/test";
import {
  CorrectionRequesterRole,
  CorrectionRequestTargetType,
  PostScope,
  PostStatus,
  PostType,
  PrismaClient,
  ReportReason,
  ReportStatus,
  ReportTarget,
  UserRole,
} from "@prisma/client";

import { assertLocalDevelopmentDatabase } from "../src/server/local-database-guard";
import { hashPassword } from "../src/server/password";

const DEFAULT_BASE_URL = "https://townpet.vercel.app";
const SESSION_COOKIE_NAMES = [
  "townpet.session-token",
  "__Secure-townpet.session-token",
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

export type AdminQueueSmokeConfig = {
  baseUrl: string;
  email?: string;
  password?: string;
  useLocalFixtures: boolean;
};

type AdminQueueSmokeMode = "production_credentials" | "local_fixtures";

export type AdminQueuePageCheck = {
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

type AdminQueueSmokeRunConfig = {
  generatedAt: string;
  repoRoot: string;
  outputDir: string;
  smokeConfig: AdminQueueSmokeConfig;
  mode: AdminQueueSmokeMode;
};

type AdminQueueSmokeResult = {
  outputDir: string;
  reportPath: string;
  mode: AdminQueueSmokeMode;
  results: AdminQueuePageCheck[];
  output: string;
  exitCode: 0 | 1;
};

type WriteFileLike = typeof writeFileDefault;

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

export class AdminQueueSmokeBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminQueueSmokeBlockedError";
  }
}

function requireCredential(env: AdminQueueSmokeEnv, key: string) {
  const value = env[key]?.trim();
  if (!value) {
    throw new AdminQueueSmokeBlockedError(
      `${key} is required for authenticated admin queue smoke.`,
    );
  }
  return value;
}

function hasTruthyFlag(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function isLocalBaseUrl(value: string) {
  try {
    const parsed = new URL(value);
    return ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function resolveAdminQueueSmokeConfig(
  env: AdminQueueSmokeEnv,
): AdminQueueSmokeConfig {
  const baseUrl = normalizeBaseUrl(env.OPS_BASE_URL || DEFAULT_BASE_URL);
  const useLocalFixtures = hasTruthyFlag(env.ADMIN_QUEUE_SMOKE_LOCAL_FIXTURES);
  if (useLocalFixtures) {
    if (!isLocalBaseUrl(baseUrl)) {
      throw new AdminQueueSmokeBlockedError(
        "ADMIN_QUEUE_SMOKE_LOCAL_FIXTURES=1 requires OPS_BASE_URL to point to localhost.",
      );
    }

    return {
      baseUrl,
      useLocalFixtures: true,
    };
  }

  return {
    baseUrl,
    email: requireCredential(env, "ADMIN_QUEUE_SMOKE_EMAIL"),
    password: requireCredential(env, "ADMIN_QUEUE_SMOKE_PASSWORD"),
    useLocalFixtures: false,
  };
}

export function resolveAdminQueueSmokeRunConfig(params: {
  env?: AdminQueueSmokeEnv;
  now?: Date;
  repoRoot?: string;
} = {}): AdminQueueSmokeRunConfig {
  const env = params.env ?? process.env;
  const generatedAt = (params.now ?? new Date()).toISOString();
  const timestamp = compactTimestamp(new Date(generatedAt));
  const repoRoot = params.repoRoot ?? resolveRepoRoot();
  const smokeConfig = resolveAdminQueueSmokeConfig(env);
  const mode = smokeConfig.useLocalFixtures ? "local_fixtures" : "production_credentials";

  return {
    generatedAt,
    repoRoot,
    outputDir: path.join(repoRoot, "docs/reports", `admin-queue-smoke-${timestamp}`),
    smokeConfig,
    mode,
  };
}

type LocalAdminQueueSmokeFixtures = {
  email: string;
  password: string;
  cleanup: () => Promise<void>;
};

type AdminQueueSmokeCleanupResources = {
  page?: Pick<Page, "close"> | null;
  browser?: { close: () => Promise<void> } | null;
  localFixtures?: Pick<LocalAdminQueueSmokeFixtures, "cleanup"> | null;
};

function createLocalSmokePassword() {
  return `AdminSmoke-${randomUUID()}-TownPet!9`;
}

async function prepareLocalAdminQueueSmokeFixtures(
  env: AdminQueueSmokeEnv,
): Promise<LocalAdminQueueSmokeFixtures> {
  assertLocalDevelopmentDatabase(env as NodeJS.ProcessEnv, "local admin queue smoke fixtures");

  const prisma = new PrismaClient();
  const runId = `admin-queue-smoke-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const password = createLocalSmokePassword();
  const passwordHash = await hashPassword(password);
  const emails = {
    admin: `${runId}-admin@townpet.dev`,
    author: `${runId}-author@townpet.dev`,
    reporter: `${runId}-reporter@townpet.dev`,
  };
  const createdIds: { postId?: string; correctionRequestId?: string } = {};

  const cleanup = async () => {
    const reportCleanupFilters: Array<{
      targetId?: string;
      postTargetId?: string;
      description?: { contains: string };
    }> = [{ description: { contains: runId } }];
    if (createdIds.postId) {
      reportCleanupFilters.push(
        { targetId: createdIds.postId },
        { postTargetId: createdIds.postId },
      );
    }

    await prisma.report.deleteMany({
      where: {
        OR: reportCleanupFilters,
      },
    });
    if (createdIds.correctionRequestId) {
      await prisma.informationCorrectionRequest.deleteMany({
        where: { id: createdIds.correctionRequestId },
      });
    }
    if (createdIds.postId) {
      await prisma.post.deleteMany({ where: { id: createdIds.postId } });
    }
    await prisma.user.deleteMany({
      where: { email: { in: Object.values(emails) } },
    });
    await prisma.$disconnect();
  };

  try {
    const [, author, reporter] = await prisma.$transaction([
      prisma.user.create({
        data: {
          email: emails.admin,
          nickname: `${runId}-admin`,
          role: UserRole.ADMIN,
          passwordHash,
          emailVerified: new Date(),
        },
        select: { id: true },
      }),
      prisma.user.create({
        data: {
          email: emails.author,
          nickname: `${runId}-author`,
          emailVerified: new Date(),
        },
        select: { id: true },
      }),
      prisma.user.create({
        data: {
          email: emails.reporter,
          nickname: `${runId}-reporter`,
          emailVerified: new Date(),
        },
        select: { id: true },
      }),
    ]);

    const post = await prisma.post.create({
      data: {
        authorId: author.id,
        type: PostType.FREE_BOARD,
        scope: PostScope.GLOBAL,
        status: PostStatus.ACTIVE,
        title: `[ADMIN QUEUE SMOKE] ${runId}`,
        content: "관리자 신고 큐 smoke 검증용 임시 게시글입니다.",
        structuredSearchText: `[ADMIN QUEUE SMOKE] ${runId} 관리자 신고 큐 smoke`,
      },
      select: { id: true },
    });
    createdIds.postId = post.id;

    await prisma.report.create({
      data: {
        reporterId: reporter.id,
        targetType: ReportTarget.POST,
        targetId: post.id,
        postTargetId: post.id,
        targetUserId: author.id,
        reason: ReportReason.SPAM,
        description: `local fixture ${runId}`,
        status: ReportStatus.PENDING,
      },
    });

    const correctionRequest = await prisma.informationCorrectionRequest.create({
      data: {
        requesterUserId: reporter.id,
        postId: post.id,
        targetType: CorrectionRequestTargetType.POST,
        targetName: `[ADMIN QUEUE SMOKE] ${runId}`,
        requesterRole: CorrectionRequesterRole.CUSTOMER,
        requesterName: "관리자 큐 smoke 요청자",
        requesterEmail: emails.reporter,
        requestedChange: "관리자 정정 큐 smoke 검증용 임시 요청입니다.",
        clientIpHash: runId,
      },
      select: { id: true },
    });
    createdIds.correctionRequestId = correctionRequest.id;

    return {
      email: emails.admin,
      password,
      cleanup,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

export async function cleanupAdminQueueSmokeResources({
  page,
  browser,
  localFixtures,
}: AdminQueueSmokeCleanupResources) {
  const cleanupErrors: unknown[] = [];
  for (const cleanupTask of [
    () => page?.close(),
    () => browser?.close(),
    () => localFixtures?.cleanup(),
  ]) {
    try {
      await cleanupTask();
    } catch (error) {
      cleanupErrors.push(error);
    }
  }

  if (cleanupErrors.length > 0) {
    throw new AggregateError(cleanupErrors, "Admin queue smoke cleanup failed.");
  }
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

  await mkdirDefault(path.dirname(params.screenshotPath), { recursive: true });
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
  mode: AdminQueueSmokeMode;
  results: AdminQueuePageCheck[];
}) {
  const allPassed = params.results.every((result) => result.status === "PASS");
  const lines = [
    "# Admin Queue Smoke",
    "",
    `- generatedAt: \`${params.generatedAt}\``,
    `- baseUrl: \`${params.baseUrl}\``,
    `- status: \`${allPassed ? "PASS" : "NO-GO"}\``,
    `- mode: \`${params.mode}\``,
    `- auth: ${params.mode === "local_fixtures" ? "generated local admin credential login" : "configured admin credential login"}`,
    "- scope: read-only admin page rendering",
    "",
  ];

  if (params.mode === "local_fixtures") {
    lines.push(
      "## Mode Note",
      "",
      "- local fixture mode validates local UI/queue rendering only.",
      "- next: production credential이 준비되면 `production_credentials` mode로 원격 authenticated smoke를 다시 실행하세요.",
      "",
    );
  }

  lines.push(
    "## Summary",
    "",
    "| page | status | report queue | correction queue | expected surface | no overflow | screenshot |",
    "| --- | ---: | ---: | ---: | ---: | ---: | --- |",
  );

  for (const result of params.results) {
    lines.push(
      `| ${result.path} | ${result.status} | ${result.hasReportQueue ? "PASS" : "FAIL"} | ${result.hasCorrectionQueue ? "PASS" : "FAIL"} | ${result.hasExpectedSurface ? "PASS" : "FAIL"} | ${result.noHorizontalOverflow ? "PASS" : "FAIL"} | \`${path.relative(resolveRepoRoot(), result.screenshot)}\` |`,
    );
  }

  if (!allPassed) {
    lines.push(
      "",
      "## NO-GO Next Action",
      "",
      "- 로그인/권한 gate, queue summary text, page-specific surface, horizontal overflow 중 실패 항목을 먼저 수정하세요.",
      "- 실패 screenshot을 확인한 뒤 같은 mode로 smoke를 재실행하세요.",
    );
  }

  return `${lines.join("\n")}\n`;
}

export async function runAdminQueueSmoke(params: {
  env?: AdminQueueSmokeEnv;
  now?: Date;
  repoRoot?: string;
  prepareLocalFixtures?: (env: AdminQueueSmokeEnv) => Promise<LocalAdminQueueSmokeFixtures>;
  launchBrowser?: () => Promise<Awaited<ReturnType<typeof chromium.launch>>>;
  login?: typeof loginWithCredentials;
  inspectPage?: typeof inspectAdminQueuePage;
  mkdir?: typeof mkdirDefault;
  writeFile?: WriteFileLike;
} = {}): Promise<AdminQueueSmokeResult> {
  const env = params.env ?? process.env;
  const runConfig = resolveAdminQueueSmokeRunConfig({
    env,
    now: params.now,
    repoRoot: params.repoRoot,
  });
  const config = runConfig.smokeConfig;
  const prepareLocalFixtures = params.prepareLocalFixtures ?? prepareLocalAdminQueueSmokeFixtures;
  const launchBrowser = params.launchBrowser ?? (() => chromium.launch());
  const login = params.login ?? loginWithCredentials;
  const inspectPage = params.inspectPage ?? inspectAdminQueuePage;
  const mkdir = params.mkdir ?? mkdirDefault;
  const writeFile = params.writeFile ?? writeFileDefault;

  let localFixtures: LocalAdminQueueSmokeFixtures | null = null;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  let page: Page | null = null;
  let results: AdminQueuePageCheck[] = [];
  try {
    localFixtures = config.useLocalFixtures
      ? await prepareLocalFixtures(env)
      : null;
    const credentials = localFixtures ?? {
      email: config.email,
      password: config.password,
    };
    if (!credentials.email || !credentials.password) {
      throw new AdminQueueSmokeBlockedError("Admin queue smoke credentials were not resolved.");
    }

    browser = await launchBrowser();
    page = await browser.newPage({
      viewport: { width: 1365, height: 900 },
      deviceScaleFactor: 1,
    });

    await login({
      context: page.context(),
      page,
      baseUrl: config.baseUrl,
      email: credentials.email,
      password: credentials.password,
      nextPath: "/admin/reports",
    });

    results = [
      await inspectPage({
        page,
        baseUrl: config.baseUrl,
        id: "reports",
        path: "/admin/reports",
        expectedSurfaceText: "신고 우선순위 검토",
        screenshotPath: path.join(runConfig.outputDir, "admin-reports.png"),
      }),
      await inspectPage({
        page,
        baseUrl: config.baseUrl,
        id: "corrections",
        path: "/admin/corrections",
        expectedSurfaceText: "정보 정정 요청 검토",
        screenshotPath: path.join(runConfig.outputDir, "admin-corrections.png"),
      }),
    ];
  } finally {
    await cleanupAdminQueueSmokeResources({ page, browser, localFixtures });
  }

  const reportPath = path.join(runConfig.outputDir, "README.md");
  await mkdir(runConfig.outputDir, { recursive: true });
  await writeFile(
    reportPath,
    buildAdminQueueSmokeMarkdown({
      generatedAt: runConfig.generatedAt,
      baseUrl: config.baseUrl,
      mode: runConfig.mode,
      results,
    }),
    "utf8",
  );

  const outputLines = [`Admin queue smoke written: ${path.relative(runConfig.repoRoot, runConfig.outputDir)}`];
  for (const result of results) {
    outputLines.push(
      `${result.path}: status=${result.status} reportQueue=${result.hasReportQueue} correctionQueue=${result.hasCorrectionQueue} expected=${result.hasExpectedSurface} overflow=${result.noHorizontalOverflow}`,
    );
  }

  return {
    outputDir: runConfig.outputDir,
    reportPath,
    mode: runConfig.mode,
    results,
    output: outputLines.join("\n"),
    exitCode: results.some((result) => result.status !== "PASS") ? 1 : 0,
  };
}

export async function main(params: Parameters<typeof runAdminQueueSmoke>[0] = {}) {
  const result = await runAdminQueueSmoke(params);
  console.log(result.output);

  if (result.exitCode !== 0) {
    throw new Error("Admin queue smoke failed.");
  }

  return result.output;
}

if (
  process.env.NODE_ENV !== "test" &&
  process.argv[1]?.endsWith("check-admin-queue-smoke.ts")
) {
  main().catch((error) => {
    if (error instanceof AdminQueueSmokeBlockedError) {
      console.error("Admin queue smoke BLOCKED");
      console.error(error.message);
      process.exit(1);
    }

    console.error("Admin queue smoke failed");
    console.error(error);
    process.exit(1);
  });
}
