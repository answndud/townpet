import { expect, test } from "@playwright/test";

import { prisma } from "../src/lib/prisma";
import {
  DEFAULT_E2E_PASSWORD,
  ensureCredentialUser,
  loginWithCredentialsApi,
} from "./support/auth-helpers";
import { expectNoHorizontalOverflow, expectTouchTarget } from "./support/visual-smoke-helpers";

const TEST_EMAIL = "e2e.create-visual@townpet.dev";

async function ensureLocalProfile(userId: string) {
  const neighborhood = await prisma.neighborhood.upsert({
    where: {
      name_city_district: {
        name: "서초동",
        city: "서울",
        district: "서초구",
      },
    },
    update: {},
    create: {
      name: "서초동",
      city: "서울",
      district: "서초구",
    },
    select: { id: true },
  });

  await prisma.userNeighborhood.upsert({
    where: {
      userId_neighborhoodId: {
        userId,
        neighborhoodId: neighborhood.id,
      },
    },
    update: { isPrimary: true },
    create: {
      userId,
      neighborhoodId: neighborhood.id,
      isPrimary: true,
    },
  });
}

test.describe("post create editor visual smoke", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeAll(async () => {
    const user = await ensureCredentialUser({
      email: TEST_EMAIL,
      password: DEFAULT_E2E_PASSWORD,
      nicknamePrefix: "create-visual",
    });
    await ensureLocalProfile(user.id);
  });

  test("keeps mobile post create form and editor actions usable", async ({ page }) => {
    await loginWithCredentialsApi(page, {
      email: TEST_EMAIL,
      password: DEFAULT_E2E_PASSWORD,
      next: "/posts/new",
    });

    await page.evaluate(() => {
      window.localStorage.removeItem("townpet:post-create-draft:v1");
    });
    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "새 글 작성" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("post-body-editor")).toBeVisible({ timeout: 15_000 });
    await expectNoHorizontalOverflow(page);

    await expectTouchTarget(page.getByLabel("제목"), "title input");
    await expectTouchTarget(page.getByLabel("분류"), "type select");
    await expectTouchTarget(page.getByTestId("post-body-editor"), "rich text editor", 120);

    await expectTouchTarget(page.getByRole("button", { name: "크기" }), "font size toolbar button");
    await expectTouchTarget(page.getByRole("button", { name: "링크" }), "link toolbar button");
    await expectTouchTarget(page.getByRole("button", { name: "이미지" }), "image toolbar button");
    await expectTouchTarget(page.getByRole("button", { name: "임시저장 삭제" }), "clear draft button");

    await expectTouchTarget(
      page.locator('a[href="/feed"]').filter({ hasText: "취소" }),
      "cancel link",
    );
    await expectTouchTarget(page.getByRole("button", { name: "등록" }), "submit button");
    await expectNoHorizontalOverflow(page);
  });
});
