import { expect, test } from "@playwright/test";
import {
  FeedAudienceSource,
  FeedPersonalizationEvent,
  FeedPersonalizationSurface,
  UserRole,
} from "@prisma/client";

import { prisma } from "../src/lib/prisma";
import {
  DEFAULT_E2E_PASSWORD,
  ensureModeratorUser,
  loginWithCredentialsApi,
} from "./support/auth-helpers";

const adminEmail = "e2e-personalization-admin@townpet.dev";
const audienceKeys = ["E2E_DIAG_MALTESE", "E2E_DIAG_POODLE"];

function todayUtc() {
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  return day;
}

async function deleteDiagnosticRows() {
  await prisma.feedPersonalizationStat.deleteMany({
    where: {
      audienceKey: { in: audienceKeys },
    },
  });
}

async function seedDiagnosticRows() {
  const day = todayUtc();
  await prisma.feedPersonalizationStat.createMany({
    data: [
      {
        day,
        surface: FeedPersonalizationSurface.FEED,
        event: FeedPersonalizationEvent.VIEW,
        audienceKey: audienceKeys[0],
        breedCode: "MALTESE",
        audienceSource: FeedAudienceSource.SEGMENT,
        count: 900_000,
      },
      {
        day,
        surface: FeedPersonalizationSurface.FEED,
        event: FeedPersonalizationEvent.VIEW,
        audienceKey: audienceKeys[1],
        breedCode: "POODLE",
        audienceSource: FeedAudienceSource.SEGMENT,
        count: 100_000,
      },
      {
        day,
        surface: FeedPersonalizationSurface.FEED,
        event: FeedPersonalizationEvent.POST_CLICK,
        audienceKey: audienceKeys[0],
        breedCode: "MALTESE",
        audienceSource: FeedAudienceSource.SEGMENT,
        count: 100,
      },
      {
        day,
        surface: FeedPersonalizationSurface.FEED,
        event: FeedPersonalizationEvent.AD_IMPRESSION,
        audienceKey: audienceKeys[0],
        breedCode: "MALTESE",
        audienceSource: FeedAudienceSource.SEGMENT,
        count: 100_000,
      },
      {
        day,
        surface: FeedPersonalizationSurface.FEED,
        event: FeedPersonalizationEvent.AD_CLICK,
        audienceKey: audienceKeys[0],
        breedCode: "MALTESE",
        audienceSource: FeedAudienceSource.SEGMENT,
        count: 5_000,
      },
    ],
  });
}

test.describe("admin personalization diagnostics", () => {
  test.beforeEach(async () => {
    await ensureModeratorUser({
      email: adminEmail,
      password: DEFAULT_E2E_PASSWORD,
      role: UserRole.ADMIN,
      nicknamePrefix: "personalization-admin",
    });
    await deleteDiagnosticRows();
    await seedDiagnosticRows();
  });

  test.afterEach(async () => {
    await deleteDiagnosticRows();
  });

  test("shows diagnostic status and next-action links", async ({ page }) => {
    await loginWithCredentialsApi(page, {
      email: adminEmail,
      password: DEFAULT_E2E_PASSWORD,
      next: "/admin/personalization?days=7",
    });

    await expect(page.getByRole("heading", { name: "기준별 다음 행동" })).toBeVisible();
    await expect(page.getByTestId("personalization-diagnostic-data")).toContainText("판단 가능");
    await expect(page.getByTestId("personalization-diagnostic-postCtr")).toContainText(
      "저성과 조치",
    );
    await expect(page.getByTestId("personalization-diagnostic-adCtr")).toContainText(
      "광고 조치",
    );
    await expect(page.getByTestId("personalization-diagnostic-audience")).toContainText(
      "편향 조치",
    );
    await expect(
      page.getByTestId("personalization-diagnostic-audience").getByRole("link", {
        name: "품종 사전",
      }),
    ).toHaveAttribute("href", "/admin/breeds");
  });

  test("keeps diagnostic cards readable on mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginWithCredentialsApi(page, {
      email: adminEmail,
      password: DEFAULT_E2E_PASSWORD,
      next: "/admin/personalization?days=7",
    });

    await expect(page.getByRole("heading", { name: "기준별 다음 행동" })).toBeVisible();
    await expect(page.getByTestId("personalization-diagnostic-postCtr")).toBeVisible();
    await expect(page.getByTestId("personalization-diagnostic-postCtr")).toContainText(
      "정책 후보와 Ops 안정성 확인",
    );
    await expect
      .poll(async () =>
        page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      )
      .toBe(true);
  });
});
