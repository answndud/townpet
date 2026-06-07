import { describe, expect, it, vi } from "vitest";

import {
  AdminQueueSmokeBlockedError,
  adminQueuePagePassed,
  buildAdminQueueSmokeMarkdown,
  cleanupAdminQueueSmokeResources,
  main,
  resolveAdminQueueSmokeBrowserLaunchOptions,
  resolveAdminQueueSmokeConfig,
  resolveAdminQueueSmokeRunConfig,
  runAdminQueueSmoke,
  type AdminQueuePageCheck,
} from "./check-admin-queue-smoke";

function createPageCheck(overrides: Partial<AdminQueuePageCheck> = {}): AdminQueuePageCheck {
  return {
    id: "reports",
    path: "/admin/reports",
    status: "PASS",
    url: "http://localhost:3000/admin/reports",
    screenshot: "/tmp/admin-reports.png",
    hasReportQueue: true,
    hasCorrectionQueue: true,
    hasExpectedSurface: true,
    noHorizontalOverflow: true,
    ...overrides,
  };
}

describe("admin queue smoke", () => {
  it("requires explicit admin smoke credentials", () => {
    expect(() => resolveAdminQueueSmokeConfig({})).toThrow(
      "ADMIN_QUEUE_SMOKE_EMAIL is required",
    );
    expect(() => resolveAdminQueueSmokeConfig({})).toThrow(AdminQueueSmokeBlockedError);
    expect(() =>
      resolveAdminQueueSmokeConfig({
        ADMIN_QUEUE_SMOKE_EMAIL: "admin@example.com",
      }),
    ).toThrow("ADMIN_QUEUE_SMOKE_PASSWORD is required");
  });

  it("normalizes base URL and reads credentials", () => {
    expect(
      resolveAdminQueueSmokeConfig({
        OPS_BASE_URL: "https://townpet.vercel.app/",
        ADMIN_QUEUE_SMOKE_EMAIL: " admin@example.com ",
        ADMIN_QUEUE_SMOKE_PASSWORD: " secret ",
      }),
    ).toEqual({
      baseUrl: "https://townpet.vercel.app",
      email: "admin@example.com",
      password: "secret",
      useLocalFixtures: false,
    });
  });

  it("allows explicit local fixture mode only against localhost", () => {
    expect(
      resolveAdminQueueSmokeConfig({
        OPS_BASE_URL: "http://localhost:3000/",
        ADMIN_QUEUE_SMOKE_LOCAL_FIXTURES: "1",
      }),
    ).toEqual({
      baseUrl: "http://localhost:3000",
      useLocalFixtures: true,
    });

    expect(() =>
      resolveAdminQueueSmokeConfig({
        OPS_BASE_URL: "https://townpet.vercel.app",
        ADMIN_QUEUE_SMOKE_LOCAL_FIXTURES: "1",
      }),
    ).toThrow("requires OPS_BASE_URL to point to localhost");
  });

  it("resolves optional browser launch override for CI system Chrome", () => {
    expect(
      resolveAdminQueueSmokeBrowserLaunchOptions({
        ADMIN_QUEUE_SMOKE_BROWSER_CHANNEL: " chrome ",
      }),
    ).toEqual({ channel: "chrome" });

    expect(
      resolveAdminQueueSmokeBrowserLaunchOptions({
        ADMIN_QUEUE_SMOKE_CHROMIUM_EXECUTABLE_PATH: " /usr/bin/google-chrome ",
      }),
    ).toEqual({ executablePath: "/usr/bin/google-chrome" });

    expect(() =>
      resolveAdminQueueSmokeBrowserLaunchOptions({
        ADMIN_QUEUE_SMOKE_BROWSER_CHANNEL: "chrome",
        ADMIN_QUEUE_SMOKE_CHROMIUM_EXECUTABLE_PATH: "/usr/bin/google-chrome",
      }),
    ).toThrow("Use either ADMIN_QUEUE_SMOKE_BROWSER_CHANNEL");
  });

  it("resolves deterministic run config for production credential mode", () => {
    expect(
      resolveAdminQueueSmokeRunConfig({
        env: {
          OPS_BASE_URL: "https://townpet.example/",
          ADMIN_QUEUE_SMOKE_EMAIL: "admin@example.com",
          ADMIN_QUEUE_SMOKE_PASSWORD: "secret",
        },
        now: new Date("2026-01-02T03:04:05.000Z"),
        repoRoot: "/repo",
      }),
    ).toEqual({
      generatedAt: "2026-01-02T03:04:05.000Z",
      repoRoot: "/repo",
      outputDir: "/repo/docs/reports/admin-queue-smoke-2026-01-02T03-04-05-000Z",
      mode: "production_credentials",
      smokeConfig: {
        baseUrl: "https://townpet.example",
        email: "admin@example.com",
        password: "secret",
        useLocalFixtures: false,
      },
    });
  });

  it("runs production credential mode with injected browser, login, inspector, and writer", async () => {
    const closePage = vi.fn().mockResolvedValue(undefined);
    const closeBrowser = vi.fn().mockResolvedValue(undefined);
    const login = vi.fn().mockResolvedValue(undefined);
    const inspectPage = vi
      .fn()
      .mockResolvedValueOnce(createPageCheck({ id: "reports", path: "/admin/reports" }))
      .mockResolvedValueOnce(
        createPageCheck({ id: "corrections", path: "/admin/corrections", screenshot: "/tmp/admin-corrections.png" }),
      );
    const writeFile = vi.fn().mockResolvedValue(undefined);
    const mkdir = vi.fn().mockResolvedValue(undefined);

    const result = await runAdminQueueSmoke({
      env: {
        OPS_BASE_URL: "https://townpet.example",
        ADMIN_QUEUE_SMOKE_EMAIL: "admin@example.com",
        ADMIN_QUEUE_SMOKE_PASSWORD: "secret",
      },
      now: new Date("2026-01-02T03:04:05.000Z"),
      repoRoot: "/repo",
      launchBrowser: async () =>
        ({
          close: closeBrowser,
          newPage: async () => ({
            close: closePage,
            context: () => ({}),
          }),
        }) as never,
      login: login as never,
      inspectPage: inspectPage as never,
      mkdir: mkdir as never,
      writeFile: writeFile as never,
    });

    expect(result.exitCode).toBe(0);
    expect(result.mode).toBe("production_credentials");
    expect(result.output).toContain("/admin/reports: status=PASS");
    expect(login).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "https://townpet.example",
        email: "admin@example.com",
        password: "secret",
        nextPath: "/admin/reports",
      }),
    );
    expect(inspectPage).toHaveBeenCalledTimes(2);
    expect(closePage).toHaveBeenCalledOnce();
    expect(closeBrowser).toHaveBeenCalledOnce();
    expect(mkdir).toHaveBeenCalledWith(
      "/repo/docs/reports/admin-queue-smoke-2026-01-02T03-04-05-000Z",
      { recursive: true },
    );
    expect(writeFile).toHaveBeenCalledWith(
      "/repo/docs/reports/admin-queue-smoke-2026-01-02T03-04-05-000Z/README.md",
      expect.stringContaining("# Admin Queue Smoke"),
      "utf8",
    );
  });

  it("runs local fixture mode and cleans up generated fixture data", async () => {
    const fixtureCleanup = vi.fn().mockResolvedValue(undefined);
    const prepareLocalFixtures = vi.fn().mockResolvedValue({
      email: "fixture-admin@townpet.dev",
      password: "fixture-secret",
      cleanup: fixtureCleanup,
    });

    const result = await runAdminQueueSmoke({
      env: {
        OPS_BASE_URL: "http://localhost:3000",
        ADMIN_QUEUE_SMOKE_LOCAL_FIXTURES: "1",
      },
      repoRoot: "/repo",
      prepareLocalFixtures,
      launchBrowser: async () =>
        ({
          close: vi.fn().mockResolvedValue(undefined),
          newPage: async () => ({ close: vi.fn().mockResolvedValue(undefined), context: () => ({}) }),
        }) as never,
      login: vi.fn().mockResolvedValue(undefined) as never,
      inspectPage: vi.fn().mockResolvedValue(createPageCheck()) as never,
      mkdir: vi.fn().mockResolvedValue(undefined) as never,
      writeFile: vi.fn().mockResolvedValue(undefined) as never,
    });

    expect(result.mode).toBe("local_fixtures");
    expect(result.exitCode).toBe(0);
    expect(prepareLocalFixtures).toHaveBeenCalledWith(
      expect.objectContaining({ ADMIN_QUEUE_SMOKE_LOCAL_FIXTURES: "1" }),
    );
    expect(fixtureCleanup).toHaveBeenCalledOnce();
  });

  it("returns failed exit code when an admin page check fails", async () => {
    const result = await runAdminQueueSmoke({
      env: {
        OPS_BASE_URL: "https://townpet.example",
        ADMIN_QUEUE_SMOKE_EMAIL: "admin@example.com",
        ADMIN_QUEUE_SMOKE_PASSWORD: "secret",
      },
      repoRoot: "/repo",
      launchBrowser: async () =>
        ({
          close: vi.fn().mockResolvedValue(undefined),
          newPage: async () => ({ close: vi.fn().mockResolvedValue(undefined), context: () => ({}) }),
        }) as never,
      login: vi.fn().mockResolvedValue(undefined) as never,
      inspectPage: vi
        .fn()
        .mockResolvedValueOnce(createPageCheck({ status: "FAIL", hasCorrectionQueue: false }))
        .mockResolvedValueOnce(createPageCheck({ id: "corrections", path: "/admin/corrections" })) as never,
      mkdir: vi.fn().mockResolvedValue(undefined) as never,
      writeFile: vi.fn().mockResolvedValue(undefined) as never,
    });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("status=FAIL");
  });

  it("prints CLI output through main on pass", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const output = await main({
      env: {
        OPS_BASE_URL: "https://townpet.example",
        ADMIN_QUEUE_SMOKE_EMAIL: "admin@example.com",
        ADMIN_QUEUE_SMOKE_PASSWORD: "secret",
      },
      repoRoot: "/repo",
      launchBrowser: async () =>
        ({
          close: vi.fn().mockResolvedValue(undefined),
          newPage: async () => ({ close: vi.fn().mockResolvedValue(undefined), context: () => ({}) }),
        }) as never,
      login: vi.fn().mockResolvedValue(undefined) as never,
      inspectPage: vi.fn().mockResolvedValue(createPageCheck()) as never,
      mkdir: vi.fn().mockResolvedValue(undefined) as never,
      writeFile: vi.fn().mockResolvedValue(undefined) as never,
    });

    expect(output).toContain("Admin queue smoke written");
    expect(log).toHaveBeenCalledWith(output);
  });

  it("requires both queue switch summaries and page-specific surface", () => {
    expect(
      adminQueuePagePassed({
        hasReportQueue: true,
        hasCorrectionQueue: true,
        hasExpectedSurface: true,
        noHorizontalOverflow: true,
      }),
    ).toBe(true);

    expect(
      adminQueuePagePassed({
        hasReportQueue: true,
        hasCorrectionQueue: false,
        hasExpectedSurface: true,
        noHorizontalOverflow: true,
      }),
    ).toBe(false);
  });

  it("documents read-only admin queue smoke evidence", () => {
    const markdown = buildAdminQueueSmokeMarkdown({
      generatedAt: "2026-05-27T00:00:00.000Z",
      baseUrl: "https://townpet.vercel.app",
      mode: "production_credentials",
      results: [
        {
          id: "reports",
          path: "/admin/reports",
          status: "PASS",
          url: "https://townpet.vercel.app/admin/reports",
          screenshot: "/tmp/admin-reports.png",
          hasReportQueue: true,
          hasCorrectionQueue: true,
          hasExpectedSurface: true,
          noHorizontalOverflow: true,
        },
      ],
    });

    expect(markdown).toContain("# Admin Queue Smoke");
    expect(markdown).toContain("- status: `PASS`");
    expect(markdown).toContain("- mode: `production_credentials`");
    expect(markdown).toContain("read-only admin page rendering");
    expect(markdown).toContain("/admin/reports");
    expect(markdown).toContain("report queue");
    expect(markdown).toContain("correction queue");
  });

  it("documents local fixture mode as a production smoke follow-up", () => {
    const markdown = buildAdminQueueSmokeMarkdown({
      generatedAt: "2026-05-27T00:00:00.000Z",
      baseUrl: "http://localhost:3000",
      mode: "local_fixtures",
      results: [
        {
          id: "corrections",
          path: "/admin/corrections",
          status: "PASS",
          url: "http://localhost:3000/admin/corrections",
          screenshot: "/tmp/admin-corrections.png",
          hasReportQueue: true,
          hasCorrectionQueue: true,
          hasExpectedSurface: true,
          noHorizontalOverflow: true,
        },
      ],
    });

    expect(markdown).toContain("- mode: `local_fixtures`");
    expect(markdown).toContain("local fixture mode validates local UI/queue rendering only");
    expect(markdown).toContain("production credential이 준비되면");
  });

  it("documents NO-GO next action when a queue page check fails", () => {
    const markdown = buildAdminQueueSmokeMarkdown({
      generatedAt: "2026-05-27T00:00:00.000Z",
      baseUrl: "https://townpet.vercel.app",
      mode: "production_credentials",
      results: [
        {
          id: "reports",
          path: "/admin/reports",
          status: "FAIL",
          url: "https://townpet.vercel.app/admin/reports",
          screenshot: "/tmp/admin-reports.png",
          hasReportQueue: true,
          hasCorrectionQueue: false,
          hasExpectedSurface: true,
          noHorizontalOverflow: true,
        },
      ],
    });

    expect(markdown).toContain("- status: `NO-GO`");
    expect(markdown).toContain("## NO-GO Next Action");
    expect(markdown).toContain("실패 screenshot을 확인");
  });

  it("always attempts local fixture cleanup when another cleanup step fails", async () => {
    const pageClose = vi.fn().mockRejectedValue(new Error("page close failed"));
    const browserClose = vi.fn().mockResolvedValue(undefined);
    const fixtureCleanup = vi.fn().mockResolvedValue(undefined);

    await expect(
      cleanupAdminQueueSmokeResources({
        page: { close: pageClose },
        browser: { close: browserClose },
        localFixtures: { cleanup: fixtureCleanup },
      }),
    ).rejects.toThrow("Admin queue smoke cleanup failed");

    expect(pageClose).toHaveBeenCalledOnce();
    expect(browserClose).toHaveBeenCalledOnce();
    expect(fixtureCleanup).toHaveBeenCalledOnce();
  });
});
