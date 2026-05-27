import "dotenv/config";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";

import { chromium, devices, type Browser, type BrowserContext, type Page } from "@playwright/test";
import {
  BoardScope,
  CareRequestStatus,
  CareType,
  CommonBoardType,
  PostScope,
  PostStatus,
  PostType,
  PrismaClient,
} from "@prisma/client";

import { hashPassword } from "../src/server/password";
import { assertDatabaseAccess } from "../src/server/local-database-guard";

const SESSION_COOKIE_NAMES = [
  "townpet.session-token",
  "__Secure-townpet.session-token",
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

export const AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_ENV_KEY = "AUTH_LOCAL_DETAIL_SMOKE_CONFIRM";
export const AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_VALUE = "PUBLISH_AUTH_LOCAL_DETAIL_SMOKE_FIXTURES";

const DEFAULT_BASE_URL = "https://townpet.vercel.app";
const DEFAULT_SMOKE_TYPES = [PostType.HOSPITAL_REVIEW, PostType.CARE_REQUEST];
const AUTHOR_EMAIL = "auth-local-detail-smoke-author@townpet.dev";
const VIEWER_EMAIL = "auth-local-detail-smoke-viewer@townpet.dev";

type AuthLocalSmokePostType = typeof PostType.HOSPITAL_REVIEW | typeof PostType.CARE_REQUEST;
type SmokeProfile = "desktop" | "mobile";

type AuthLocalDetailTarget = {
  id: string;
  title: string;
  type: AuthLocalSmokePostType;
  expectedText: string;
};

type SmokeResult = {
  targetType: PostType;
  targetTitle: string;
  profile: SmokeProfile;
  url: string;
  screenshot: string;
  titleVisible: boolean;
  hasCommentSection: boolean;
  hasReportEntry: boolean;
  hasExpectedDetailText: boolean;
  noLocalGate: boolean;
  noHorizontalOverflow: boolean;
};

type GuestGateResult = {
  targetType: PostType;
  targetTitle: string;
  url: string;
  screenshot: string;
  hasLoginGate: boolean;
  hidesProtectedTitle: boolean;
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

export function parseAuthLocalSmokeTypes(value: string | undefined) {
  const types = (value?.split(",") ?? DEFAULT_SMOKE_TYPES)
    .map((item) => item.trim())
    .filter(Boolean);

  return types.filter(
    (type): type is AuthLocalSmokePostType =>
      type === PostType.HOSPITAL_REVIEW || type === PostType.CARE_REQUEST,
  );
}

function generateSmokePassword() {
  return `Smoke-${randomUUID()}-TownPet!9`;
}

async function ensureSmokeUser(params: {
  prisma: PrismaClient;
  email: string;
  nickname: string;
  passwordHash: string;
  neighborhoodId: string;
}) {
  const user = await params.prisma.user.upsert({
    where: { email: params.email },
    update: {
      nickname: params.nickname,
      nicknameUpdatedAt: null,
      emailVerified: new Date(),
      passwordHash: params.passwordHash,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
    },
    create: {
      email: params.email,
      nickname: params.nickname,
      emailVerified: new Date(),
      passwordHash: params.passwordHash,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
    },
    select: { id: true, email: true },
  });

  await params.prisma.userNeighborhood.deleteMany({ where: { userId: user.id } });
  await params.prisma.userNeighborhood.create({
    data: {
      userId: user.id,
      neighborhoodId: params.neighborhoodId,
      isPrimary: true,
    },
  });

  await params.prisma.userSanction.deleteMany({ where: { userId: user.id } });
  await params.prisma.userBlock.deleteMany({
    where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] },
  });
  await params.prisma.userMute.deleteMany({
    where: { OR: [{ userId: user.id }, { mutedUserId: user.id }] },
  });

  return user;
}

async function upsertSmokePost(params: {
  prisma: PrismaClient;
  authorId: string;
  neighborhoodId: string;
  type: AuthLocalSmokePostType;
  title: string;
  content: string;
}) {
  const existing = await params.prisma.post.findFirst({
    where: {
      title: params.title,
      type: params.type,
      status: { not: PostStatus.DELETED },
    },
    select: { id: true },
  });

  const commonData = {
    authorId: params.authorId,
    neighborhoodId: params.type === PostType.CARE_REQUEST ? params.neighborhoodId : null,
    type: params.type,
    scope: params.type === PostType.CARE_REQUEST ? PostScope.LOCAL : PostScope.GLOBAL,
    status: PostStatus.ACTIVE,
    title: params.title,
    content: params.content,
    structuredSearchText: `${params.title}\n${params.content}`,
    isOperatorContent: true,
    operatorSourceName: "TownPet 운영 점검",
    operatorSourceUrl: "https://townpet.vercel.app",
    operatorLastVerifiedAt: new Date(),
  };

  const post = existing
    ? await params.prisma.post.update({
        where: { id: existing.id },
        data: commonData,
        select: { id: true, title: true, type: true },
      })
    : await params.prisma.post.create({
        data: {
          ...commonData,
          boardScope: params.type === PostType.HOSPITAL_REVIEW ? BoardScope.COMMON : BoardScope.COMMUNITY,
          commonBoardType:
            params.type === PostType.HOSPITAL_REVIEW ? CommonBoardType.HOSPITAL : undefined,
        },
        select: { id: true, title: true, type: true },
      });

  if (params.type === PostType.HOSPITAL_REVIEW) {
    await params.prisma.hospitalReview.upsert({
      where: { postId: post.id },
      update: {
        hospitalName: "TownPet 상세 검증 동물병원",
        visitPurpose: "상세 화면 운영 점검",
        animalType: "강아지",
        treatmentType: "기본 진료",
        explanationSatisfaction: "충분히 설명을 들었어요",
        priceLevel: "보통",
        rating: 4,
        wouldRevisit: true,
      },
      create: {
        postId: post.id,
        hospitalName: "TownPet 상세 검증 동물병원",
        visitPurpose: "상세 화면 운영 점검",
        animalType: "강아지",
        treatmentType: "기본 진료",
        explanationSatisfaction: "충분히 설명을 들었어요",
        priceLevel: "보통",
        rating: 4,
        wouldRevisit: true,
      },
    });
  } else {
    await params.prisma.careRequest.upsert({
      where: { postId: post.id },
      update: {
        careType: CareType.WALK,
        startsAt: new Date("2026-06-01T10:00:00.000Z"),
        endsAt: new Date("2026-06-01T11:00:00.000Z"),
        locationNote: "상세 검증동 공원 앞",
        petNote: "5kg 소형견",
        requirements: "천천히 산책해 주세요.",
        rewardAmount: 15000,
        status: CareRequestStatus.OPEN,
      },
      create: {
        postId: post.id,
        careType: CareType.WALK,
        startsAt: new Date("2026-06-01T10:00:00.000Z"),
        endsAt: new Date("2026-06-01T11:00:00.000Z"),
        locationNote: "상세 검증동 공원 앞",
        petNote: "5kg 소형견",
        requirements: "천천히 산책해 주세요.",
        rewardAmount: 15000,
        status: CareRequestStatus.OPEN,
      },
    });
  }

  return post;
}

async function ensureAuthLocalSmokeTargets(params: {
  prisma: PrismaClient;
  env: NodeJS.ProcessEnv;
  password: string;
}) {
  assertDatabaseAccess({
    env: params.env,
    confirmEnvKey: AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_ENV_KEY,
    confirmValue: AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_VALUE,
    operationLabel: "auth/local detail visual smoke fixture publishing",
  });

  const passwordHash = await hashPassword(params.password);
  const neighborhood = await params.prisma.neighborhood.upsert({
    where: {
      name_city_district: {
        city: "TownPet",
        district: "운영검증",
        name: "상세검증동",
      },
    },
    update: {},
    create: {
      city: "TownPet",
      district: "운영검증",
      name: "상세검증동",
    },
    select: { id: true },
  });

  const author = await ensureSmokeUser({
    prisma: params.prisma,
    email: AUTHOR_EMAIL,
    nickname: "상세검증작성자",
    passwordHash,
    neighborhoodId: neighborhood.id,
  });
  const viewer = await ensureSmokeUser({
    prisma: params.prisma,
    email: VIEWER_EMAIL,
    nickname: "상세검증방문자",
    passwordHash,
    neighborhoodId: neighborhood.id,
  });

  const hospitalPost = await upsertSmokePost({
    prisma: params.prisma,
    authorId: author.id,
    neighborhoodId: neighborhood.id,
    type: PostType.HOSPITAL_REVIEW,
    title: "병원 후기 상세 화면 검증용 안전 정보",
    content:
      "로그인 후 병원 후기 상세 화면이 제목, 댓글, 신고, 병원 구조화 정보를 안정적으로 보여주는지 확인하는 운영 점검 글입니다.",
  });
  const carePost = await upsertSmokePost({
    prisma: params.prisma,
    authorId: author.id,
    neighborhoodId: neighborhood.id,
    type: PostType.CARE_REQUEST,
    title: "동네 돌봄 요청 상세 화면 검증용 정보",
    content:
      "같은 동네 사용자가 돌봄 요청 상세 화면을 열었을 때 지역 게이트가 풀리고 돌봄 요청 정보가 보이는지 확인하는 운영 점검 글입니다.",
  });

  return {
    viewerEmail: viewer.email,
    targets: [
      {
        id: hospitalPost.id,
        title: hospitalPost.title,
        type: PostType.HOSPITAL_REVIEW,
        expectedText: "TownPet 상세 검증 동물병원",
      },
      {
        id: carePost.id,
        title: carePost.title,
        type: PostType.CARE_REQUEST,
        expectedText: "돌봄 요청 정보",
      },
    ] satisfies AuthLocalDetailTarget[],
  };
}

async function createPage(browser: Browser, profile: SmokeProfile) {
  if (profile === "mobile") {
    return browser.newPage({ ...devices["iPhone 13"] });
  }

  return browser.newPage({
    viewport: { width: 1365, height: 900 },
    deviceScaleFactor: 1,
  });
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

async function inspectDetail(params: {
  browser: Browser;
  baseUrl: string;
  viewerEmail: string;
  password: string;
  target: AuthLocalDetailTarget;
  profile: SmokeProfile;
  screenshotPath: string;
}) {
  const page = await createPage(params.browser, params.profile);
  const context = page.context();
  const targetPath = `/posts/${params.target.id}`;
  const url = `${params.baseUrl}${targetPath}`;

  try {
    await loginWithCredentials({
      context,
      page,
      baseUrl: params.baseUrl,
      email: params.viewerEmail,
      password: params.password,
      nextPath: targetPath,
    });
    await page.goto(url, { waitUntil: "load", timeout: 30_000 });
    await page
      .getByRole("heading", { name: params.target.title })
      .first()
      .waitFor({ state: "visible", timeout: 15_000 })
      .catch(() => undefined);

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
      targetType: params.target.type,
      targetTitle: params.target.title,
      profile: params.profile,
      url,
      screenshot: params.screenshotPath,
      titleVisible,
      hasCommentSection: bodyText.includes("댓글"),
      hasReportEntry: bodyText.includes("신고"),
      hasExpectedDetailText: bodyText.includes(params.target.expectedText),
      noLocalGate: !bodyText.includes("내 동네 설정이 필요합니다"),
      noHorizontalOverflow,
    } satisfies SmokeResult;
  } finally {
    await page.close();
  }
}

async function inspectGuestGate(params: {
  browser: Browser;
  baseUrl: string;
  target: AuthLocalDetailTarget;
  screenshotPath: string;
}) {
  const page = await createPage(params.browser, "mobile");
  const url = `${params.baseUrl}/posts/${params.target.id}/guest`;

  try {
    await page.goto(url, { waitUntil: "load", timeout: 30_000 });
    await page
      .getByRole("heading", { name: "로그인이 필요한 게시글입니다." })
      .first()
      .waitFor({ state: "visible", timeout: 15_000 })
      .catch(() => undefined);

    const bodyText = await page.locator("body").innerText({ timeout: 10_000 });
    const hasLoginGate =
      bodyText.includes("로그인이 필요한 게시글입니다.") &&
      bodyText.includes("이 게시글은 로그인 사용자에게만 공개됩니다.") &&
      bodyText.includes("로그인하기");
    const noHorizontalOverflow = await hasNoHorizontalOverflow(page);

    await mkdir(path.dirname(params.screenshotPath), { recursive: true });
    await page.screenshot({ path: params.screenshotPath, fullPage: true });

    return {
      targetType: params.target.type,
      targetTitle: params.target.title,
      url,
      screenshot: params.screenshotPath,
      hasLoginGate,
      hidesProtectedTitle: !bodyText.includes(params.target.title),
      noHorizontalOverflow,
    } satisfies GuestGateResult;
  } finally {
    await page.close();
  }
}

export function authLocalDetailResultPassed(result: SmokeResult) {
  return (
    result.titleVisible &&
    result.hasCommentSection &&
    result.hasReportEntry &&
    result.hasExpectedDetailText &&
    result.noLocalGate &&
    result.noHorizontalOverflow
  );
}

export function authLocalGuestGateResultPassed(result: GuestGateResult) {
  return result.hasLoginGate && result.hidesProtectedTitle && result.noHorizontalOverflow;
}

export function buildAuthLocalDetailSmokeMarkdown(params: {
  generatedAt: string;
  baseUrl: string;
  requestedTypes: AuthLocalSmokePostType[];
  results: SmokeResult[];
  guestGateResults?: GuestGateResult[];
}) {
  const guestGateResults = params.guestGateResults ?? [];
  const lines = [
    "# Auth/Local Detail Visual Smoke",
    "",
    `- generatedAt: \`${params.generatedAt}\``,
    `- baseUrl: \`${params.baseUrl}\``,
    `- requestedTypes: ${params.requestedTypes.map((type) => `\`${type}\``).join(", ")}`,
    "- policyContext: `HOSPITAL_REVIEW` requires login, `CARE_REQUEST` requires matching local neighborhood.",
    "",
    "## Summary",
    "",
    "| type | target | profile | title | comments | report | expected detail | local gate | no overflow | screenshot |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
  ];

  for (const result of params.results) {
    lines.push(
      `| ${result.targetType} | ${result.targetTitle} | ${result.profile} | ${result.titleVisible ? "PASS" : "FAIL"} | ${result.hasCommentSection ? "PASS" : "FAIL"} | ${result.hasReportEntry ? "PASS" : "FAIL"} | ${result.hasExpectedDetailText ? "PASS" : "FAIL"} | ${result.noLocalGate ? "PASS" : "FAIL"} | ${result.noHorizontalOverflow ? "PASS" : "FAIL"} | \`${path.relative(resolveRepoRoot(), result.screenshot)}\` |`,
    );
  }

  lines.push("");
  lines.push("## Guest Gate");
  lines.push("");
  lines.push("| type | target | login gate | protected title hidden | no overflow | screenshot |");
  lines.push("| --- | --- | ---: | ---: | ---: | --- |");

  for (const result of guestGateResults) {
    lines.push(
      `| ${result.targetType} | ${result.targetTitle} | ${result.hasLoginGate ? "PASS" : "FAIL"} | ${result.hidesProtectedTitle ? "PASS" : "FAIL"} | ${result.noHorizontalOverflow ? "PASS" : "FAIL"} | \`${path.relative(resolveRepoRoot(), result.screenshot)}\` |`,
    );
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const timestamp = compactTimestamp(new Date(generatedAt));
  const repoRoot = resolveRepoRoot();
  const baseUrl = normalizeBaseUrl(process.env.OPS_BASE_URL || DEFAULT_BASE_URL);
  const requestedTypes = parseAuthLocalSmokeTypes(process.env.AUTH_LOCAL_DETAIL_SMOKE_TYPES);
  const password = process.env.AUTH_LOCAL_DETAIL_SMOKE_PASSWORD || generateSmokePassword();
  const prisma = new PrismaClient();

  let viewerEmail: string;
  let targets: AuthLocalDetailTarget[];
  try {
    const fixtures = await ensureAuthLocalSmokeTargets({ prisma, env: process.env, password });
    viewerEmail = fixtures.viewerEmail;
    targets = fixtures.targets.filter((target) => requestedTypes.includes(target.type));
  } finally {
    await prisma.$disconnect();
  }

  if (targets.length === 0) {
    throw new Error("No auth/local detail smoke target selected.");
  }

  const outputDir = path.join(repoRoot, "docs/reports", `auth-local-detail-visual-smoke-${timestamp}`);
  const browser = await chromium.launch();
  const results: SmokeResult[] = [];
  const guestGateResults: GuestGateResult[] = [];
  try {
    for (const target of targets) {
      guestGateResults.push(
        await inspectGuestGate({
          browser,
          baseUrl,
          target,
          screenshotPath: path.join(outputDir, `${target.type}-guest-gate-mobile.png`),
        }),
      );
      for (const profile of ["desktop", "mobile"] as const) {
        results.push(
          await inspectDetail({
            browser,
            baseUrl,
            viewerEmail,
            password,
            target,
            profile,
            screenshotPath: path.join(outputDir, `${target.type}-${profile}.png`),
          }),
        );
      }
    }
  } finally {
    await browser.close();
  }

  await writeFile(
    path.join(outputDir, "README.md"),
    buildAuthLocalDetailSmokeMarkdown({
      generatedAt,
      baseUrl,
      requestedTypes,
      results,
      guestGateResults,
    }),
    "utf8",
  );

  console.log(`Auth/local detail visual smoke written: ${path.relative(repoRoot, outputDir)}`);
  for (const result of guestGateResults) {
    console.log(
      `${result.targetType}/guest-gate: loginGate=${result.hasLoginGate} hiddenTitle=${result.hidesProtectedTitle} overflow=${result.noHorizontalOverflow}`,
    );
  }
  for (const result of results) {
    console.log(
      `${result.targetType}/${result.profile}: title=${result.titleVisible} comments=${result.hasCommentSection} report=${result.hasReportEntry} expected=${result.hasExpectedDetailText} localGate=${result.noLocalGate} overflow=${result.noHorizontalOverflow}`,
    );
  }

  if (
    guestGateResults.some((result) => !authLocalGuestGateResultPassed(result)) ||
    results.some((result) => !authLocalDetailResultPassed(result))
  ) {
    throw new Error("Auth/local detail visual smoke failed.");
  }
}

if (process.env.NODE_ENV !== "test" && require.main === module) {
  main().catch((error) => {
    console.error("Auth/local detail visual smoke failed");
    console.error(error);
    process.exit(1);
  });
}
