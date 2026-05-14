import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";

import { loginWithCredentialsApi } from "./support/auth-helpers";
import { expectNoHorizontalOverflow, expectTouchTarget } from "./support/visual-smoke-helpers";

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

    await expectTouchTarget(page.getByRole("link", { name: "Ops 대시보드" }).first(), "ops link");
    await expectTouchTarget(page.getByRole("link", { name: "신고 큐" }).first(), "reports link");
    await expectTouchTarget(page.getByRole("link", { name: "안전 우려" }), "safety filter");
    await expectTouchTarget(page.getByRole("link", { name: "확인이 필요해요" }), "issue outcome filter");
    await expectTouchTarget(page.getByRole("link", { name: "검토중" }), "reviewing status filter");

    const mobileList = page.getByTestId("care-feedback-mobile-list");
    await expectTouchTarget(mobileList.getByRole("link").first(), "care post link");
    await expectTouchTarget(
      mobileList.locator('select[name="reviewStatus"]').first(),
      "care review status select",
    );
    await expectTouchTarget(
      mobileList.locator('textarea[name="reviewNote"]').first(),
      "care review note textarea",
      96,
    );
    await expectTouchTarget(
      mobileList.getByRole("button", { name: "저장" }).first(),
      "care review save button",
    );
    await expectTouchTarget(page.getByRole("link", { name: "관리자 홈" }), "admin home nav link");
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
    await expectTouchTarget(page.getByRole("link", { name: "전체" }).first(), "all filter");
    await expectTouchTarget(page.getByRole("link", { name: "대기" }), "pending filter");
    await expectNoHorizontalOverflow(page);
  });
});
