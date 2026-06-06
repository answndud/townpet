import { describe, expect, it, vi } from "vitest";

import {
  AdminQueueSmokeBlockedError,
  adminQueuePagePassed,
  buildAdminQueueSmokeMarkdown,
  cleanupAdminQueueSmokeResources,
  resolveAdminQueueSmokeConfig,
} from "./check-admin-queue-smoke";

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
    expect(markdown).toContain("read-only admin page rendering");
    expect(markdown).toContain("/admin/reports");
    expect(markdown).toContain("report queue");
    expect(markdown).toContain("correction queue");
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
