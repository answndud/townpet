import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";

import { loginWithCredentialsApi } from "./support/auth-helpers";

test.describe("care feedback admin mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async () => {
    execFileSync("corepack", ["pnpm", "-C", "app", "db:seed:care-demo"], {
      cwd: "..",
      stdio: "pipe",
    });
  });

  test("shows a mobile card workflow without page-level horizontal overflow", async ({ page }) => {
    await loginWithCredentialsApi(page, {
      email: "care.admin@townpet.dev",
      password: "townpet123",
      next: "/admin/care-feedbacks",
    });

    await expect(page.getByTestId("care-feedback-mobile-list")).toBeVisible();
    await expect(page.getByTestId("care-feedback-desktop-table")).toBeHidden();
    await expect(page.getByRole("button", { name: "저장" }).first()).toBeVisible();

    await expect
      .poll(async () =>
        page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      )
      .toBe(true);
  });

  test("uses filter-specific empty copy on mobile", async ({ page }) => {
    await loginWithCredentialsApi(page, {
      email: "care.admin@townpet.dev",
      password: "townpet123",
      next: "/admin/care-feedbacks?reviewStatus=DISMISSED",
    });

    await expect(page.getByText("현재 조건에 맞는 신호가 없습니다")).toBeVisible();
    await expect(page.getByText("필터를 줄이거나 전체 상태로 돌아가")).toBeVisible();
    await expect
      .poll(async () =>
        page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      )
      .toBe(true);
  });
});
