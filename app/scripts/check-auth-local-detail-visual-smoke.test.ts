import { PostType } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import {
  AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_ENV_KEY,
  AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_VALUE,
  authLocalGuestGateResultPassed,
  authLocalDetailResultPassed,
  buildAuthLocalDetailSmokeMarkdown,
  main,
  parseAuthLocalSmokeTypes,
  resolveAuthLocalDetailSmokeConfig,
  runAuthLocalDetailVisualSmoke,
  type AuthLocalDetailTarget,
  type GuestGateResult,
  type SmokeResult,
} from "./check-auth-local-detail-visual-smoke";

const hospitalTarget: AuthLocalDetailTarget = {
  id: "hospital-post",
  title: "병원 후기 상세 화면 검증용 안전 정보",
  type: PostType.HOSPITAL_REVIEW,
  expectedText: "TownPet 상세 검증 동물병원",
};

const careTarget: AuthLocalDetailTarget = {
  id: "care-post",
  title: "동네 돌봄 요청 상세 화면 검증용 정보",
  type: PostType.CARE_REQUEST,
  expectedText: "돌봄 요청 정보",
};

function createDetailResult(params: {
  target: AuthLocalDetailTarget;
  profile: SmokeResult["profile"];
  overrides?: Partial<SmokeResult>;
}): SmokeResult {
  return {
    targetType: params.target.type,
    targetTitle: params.target.title,
    profile: params.profile,
    url: `https://townpet.example/posts/${params.target.id}`,
    screenshot: `/tmp/${params.target.type}-${params.profile}.png`,
    titleVisible: true,
    hasCommentSection: true,
    hasReportEntry: true,
    hasExpectedDetailText: true,
    noLocalGate: true,
    noHorizontalOverflow: true,
    ...params.overrides,
  };
}

function createGuestGateResult(params: {
  target: AuthLocalDetailTarget;
  overrides?: Partial<GuestGateResult>;
}): GuestGateResult {
  return {
    targetType: params.target.type,
    targetTitle: params.target.title,
    url: `https://townpet.example/posts/${params.target.id}/guest`,
    screenshot: `/tmp/${params.target.type}-guest-gate-mobile.png`,
    hasLoginGate: true,
    hidesProtectedTitle: true,
    noHorizontalOverflow: true,
    ...params.overrides,
  };
}

describe("auth/local detail visual smoke", () => {
  it("defaults to the policy-gated detail types only", () => {
    expect(parseAuthLocalSmokeTypes(undefined)).toEqual([
      PostType.HOSPITAL_REVIEW,
      PostType.CARE_REQUEST,
    ]);
  });

  it("ignores unsupported public smoke types", () => {
    expect(parseAuthLocalSmokeTypes("FREE_BOARD,HOSPITAL_REVIEW,CARE_REQUEST")).toEqual([
      PostType.HOSPITAL_REVIEW,
      PostType.CARE_REQUEST,
    ]);
  });

  it("resolves env config with deterministic output directory and password", () => {
    expect(
      resolveAuthLocalDetailSmokeConfig({
        env: {
          NODE_ENV: "test",
          OPS_BASE_URL: "https://townpet.example///",
          AUTH_LOCAL_DETAIL_SMOKE_TYPES: "HOSPITAL_REVIEW",
        },
        now: new Date("2026-01-02T03:04:05.000Z"),
        repoRoot: "/repo",
        password: "Smoke-test-password",
      }),
    ).toEqual({
      generatedAt: "2026-01-02T03:04:05.000Z",
      repoRoot: "/repo",
      baseUrl: "https://townpet.example",
      requestedTypes: [PostType.HOSPITAL_REVIEW],
      password: "Smoke-test-password",
      outputDir: "/repo/docs/reports/auth-local-detail-visual-smoke-2026-01-02T03-04-05-000Z",
    });
  });

  it("runs auth/local detail smoke with injected fixtures, browser, inspectors, and report writer", async () => {
    const disconnect = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn().mockResolvedValue(undefined);
    const ensureTargets = vi.fn().mockResolvedValue({
      viewerEmail: "viewer@townpet.dev",
      targets: [hospitalTarget, careTarget],
    });
    const inspectGuestGate = vi.fn(async ({ target }) => createGuestGateResult({ target }));
    const inspectDetail = vi.fn(async ({ target, profile }) => createDetailResult({ target, profile }));
    const mkdir = vi.fn().mockResolvedValue(undefined);
    const writeFile = vi.fn().mockResolvedValue(undefined);

    const result = await runAuthLocalDetailVisualSmoke({
      env: {
        NODE_ENV: "test",
        [AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_ENV_KEY]: AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_VALUE,
        OPS_BASE_URL: "https://townpet.example",
        AUTH_LOCAL_DETAIL_SMOKE_TYPES: "HOSPITAL_REVIEW",
      },
      now: new Date("2026-01-02T03:04:05.000Z"),
      repoRoot: "/repo",
      password: "Smoke-test-password",
      prisma: { $disconnect: disconnect } as never,
      ensureTargets: ensureTargets as never,
      launchBrowser: async () => ({ close }) as never,
      inspectGuestGate: inspectGuestGate as never,
      inspectDetail: inspectDetail as never,
      mkdir: mkdir as never,
      writeFile: writeFile as never,
    });

    expect(result.exitCode).toBe(0);
    expect(result.targets).toEqual([hospitalTarget]);
    expect(result.results).toHaveLength(2);
    expect(result.guestGateResults).toHaveLength(1);
    expect(result.output).toContain("HOSPITAL_REVIEW/desktop: title=true");
    expect(ensureTargets).toHaveBeenCalledWith({
      prisma: { $disconnect: disconnect },
      env: expect.objectContaining({ NODE_ENV: "test" }),
      password: "Smoke-test-password",
    });
    expect(disconnect).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
    expect(mkdir).toHaveBeenCalledWith(
      "/repo/docs/reports/auth-local-detail-visual-smoke-2026-01-02T03-04-05-000Z",
      { recursive: true },
    );
    expect(writeFile).toHaveBeenCalledWith(
      "/repo/docs/reports/auth-local-detail-visual-smoke-2026-01-02T03-04-05-000Z/README.md",
      expect.stringContaining("# Auth/Local Detail Visual Smoke"),
      "utf8",
    );
  });

  it("returns a failed exit code when guest gate checks fail", async () => {
    const result = await runAuthLocalDetailVisualSmoke({
      env: {
        NODE_ENV: "test",
        [AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_ENV_KEY]: AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_VALUE,
        OPS_BASE_URL: "https://townpet.example",
        AUTH_LOCAL_DETAIL_SMOKE_TYPES: "CARE_REQUEST",
      },
      repoRoot: "/repo",
      prisma: { $disconnect: vi.fn().mockResolvedValue(undefined) } as never,
      ensureTargets: vi.fn().mockResolvedValue({
        viewerEmail: "viewer@townpet.dev",
        targets: [careTarget],
      }) as never,
      launchBrowser: async () => ({ close: vi.fn().mockResolvedValue(undefined) }) as never,
      inspectGuestGate: (async ({ target }: { target: AuthLocalDetailTarget }) =>
        createGuestGateResult({ target, overrides: { hidesProtectedTitle: false } })) as never,
      inspectDetail: (async ({
        target,
        profile,
      }: {
        target: AuthLocalDetailTarget;
        profile: SmokeResult["profile"];
      }) => createDetailResult({ target, profile })) as never,
      mkdir: vi.fn().mockResolvedValue(undefined) as never,
      writeFile: vi.fn().mockResolvedValue(undefined) as never,
    });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("hiddenTitle=false");
  });

  it("prints CLI output through main on pass", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const output = await main({
      env: {
        NODE_ENV: "test",
        [AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_ENV_KEY]: AUTH_LOCAL_DETAIL_SMOKE_CONFIRM_VALUE,
        OPS_BASE_URL: "https://townpet.example",
        AUTH_LOCAL_DETAIL_SMOKE_TYPES: "HOSPITAL_REVIEW",
      },
      repoRoot: "/repo",
      prisma: { $disconnect: vi.fn().mockResolvedValue(undefined) } as never,
      ensureTargets: vi.fn().mockResolvedValue({
        viewerEmail: "viewer@townpet.dev",
        targets: [hospitalTarget],
      }) as never,
      launchBrowser: async () => ({ close: vi.fn().mockResolvedValue(undefined) }) as never,
      inspectGuestGate: (async ({ target }: { target: AuthLocalDetailTarget }) =>
        createGuestGateResult({ target })) as never,
      inspectDetail: (async ({
        target,
        profile,
      }: {
        target: AuthLocalDetailTarget;
        profile: SmokeResult["profile"];
      }) => createDetailResult({ target, profile })) as never,
      mkdir: vi.fn().mockResolvedValue(undefined) as never,
      writeFile: vi.fn().mockResolvedValue(undefined) as never,
    });

    expect(output).toContain("Auth/local detail visual smoke written");
    expect(log).toHaveBeenCalledWith(output);
  });

  it("requires auth detail, expected text, local gate, and overflow checks to pass", () => {
    expect(
      authLocalDetailResultPassed({
        targetType: PostType.CARE_REQUEST,
        targetTitle: "동네 돌봄 요청 상세 화면 검증용 정보",
        profile: "mobile",
        url: "https://townpet.vercel.app/posts/post-1",
        screenshot: "/tmp/CARE_REQUEST-mobile.png",
        titleVisible: true,
        hasCommentSection: true,
        hasReportEntry: true,
        hasExpectedDetailText: true,
        noLocalGate: true,
        noHorizontalOverflow: true,
      }),
    ).toBe(true);

    expect(
      authLocalDetailResultPassed({
        targetType: PostType.CARE_REQUEST,
        targetTitle: "동네 돌봄 요청 상세 화면 검증용 정보",
        profile: "mobile",
        url: "https://townpet.vercel.app/posts/post-1",
        screenshot: "/tmp/CARE_REQUEST-mobile.png",
        titleVisible: true,
        hasCommentSection: true,
        hasReportEntry: true,
        hasExpectedDetailText: true,
        noLocalGate: false,
        noHorizontalOverflow: true,
      }),
    ).toBe(false);
  });

  it("requires guest access to show the login gate and hide protected detail title", () => {
    expect(
      authLocalGuestGateResultPassed({
        targetType: PostType.HOSPITAL_REVIEW,
        targetTitle: "병원 후기 상세 화면 검증용 안전 정보",
        url: "https://townpet.vercel.app/posts/post-1/guest",
        screenshot: "/tmp/HOSPITAL_REVIEW-guest-gate-mobile.png",
        hasLoginGate: true,
        hidesProtectedTitle: true,
        noHorizontalOverflow: true,
      }),
    ).toBe(true);

    expect(
      authLocalGuestGateResultPassed({
        targetType: PostType.HOSPITAL_REVIEW,
        targetTitle: "병원 후기 상세 화면 검증용 안전 정보",
        url: "https://townpet.vercel.app/posts/post-1/guest",
        screenshot: "/tmp/HOSPITAL_REVIEW-guest-gate-mobile.png",
        hasLoginGate: true,
        hidesProtectedTitle: false,
        noHorizontalOverflow: true,
      }),
    ).toBe(false);
  });

  it("documents why these checks are separate from public smoke", () => {
    const markdown = buildAuthLocalDetailSmokeMarkdown({
      generatedAt: "2026-05-27T00:00:00.000Z",
      baseUrl: "https://townpet.vercel.app",
      requestedTypes: [PostType.HOSPITAL_REVIEW, PostType.CARE_REQUEST],
      results: [],
      guestGateResults: [
        {
          targetType: PostType.HOSPITAL_REVIEW,
          targetTitle: "병원 후기 상세 화면 검증용 안전 정보",
          url: "https://townpet.vercel.app/posts/post-1/guest",
          screenshot: "/tmp/HOSPITAL_REVIEW-guest-gate-mobile.png",
          hasLoginGate: true,
          hidesProtectedTitle: true,
          noHorizontalOverflow: true,
        },
      ],
    });

    expect(markdown).toContain("HOSPITAL_REVIEW` requires login");
    expect(markdown).toContain("CARE_REQUEST` requires matching local neighborhood");
    expect(markdown).toContain("## Guest Gate");
    expect(markdown).toContain("protected title hidden");
  });
});
