import { expect, test, type Locator, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";

import { loginWithCredentialsApi } from "./support/auth-helpers";

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    )
    .toBe(true);
}

async function expectTouchTarget(locator: Locator, minHeight = 40) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();

  expect(box).not.toBeNull();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(minHeight);
}

test.describe("care feedback admin mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async () => {
    execFileSync("corepack", ["pnpm@9.12.3", "-C", "app", "db:seed:care-demo"], {
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

    await expectTouchTarget(page.getByRole("link", { name: "Ops 대시보드" }).first());
    await expectTouchTarget(page.getByRole("link", { name: "신고 큐" }).first());
    await expectTouchTarget(page.getByRole("link", { name: "안전 우려" }));
    await expectTouchTarget(page.getByRole("link", { name: "확인이 필요해요" }));
    await expectTouchTarget(page.getByRole("link", { name: "검토중" }));

    const mobileList = page.getByTestId("care-feedback-mobile-list");
    await expectTouchTarget(mobileList.getByRole("link").first());
    await expectTouchTarget(mobileList.locator('select[name="reviewStatus"]').first());
    await expectTouchTarget(mobileList.locator('textarea[name="reviewNote"]').first(), 96);
    await expectTouchTarget(mobileList.getByRole("button", { name: "저장" }).first());
    await expectTouchTarget(page.getByRole("link", { name: "관리자 홈" }));
    await expectNoHorizontalOverflow(page);
  });

  test("uses filter-specific empty copy on mobile", async ({ page }) => {
    await loginWithCredentialsApi(page, {
      email: "care.admin@townpet.dev",
      password: "townpet123",
      next: "/admin/care-feedbacks?reviewStatus=DISMISSED",
    });

    await expect(page.getByText("현재 조건에 맞는 신호가 없습니다")).toBeVisible();
    await expect(page.getByText("필터를 줄이거나 전체 상태로 돌아가")).toBeVisible();
    await expectTouchTarget(page.getByRole("link", { name: "전체" }).first());
    await expectTouchTarget(page.getByRole("link", { name: "대기" }));
    await expectNoHorizontalOverflow(page);
  });
});
