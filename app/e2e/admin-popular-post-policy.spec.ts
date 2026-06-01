import { expect, test } from "@playwright/test";
import { UserRole } from "@prisma/client";
import type { Page } from "@playwright/test";

import { prisma } from "../src/lib/prisma";
import {
  getPopularPostPolicy,
  setPopularPostPolicy,
} from "../src/server/queries/policy.queries";
import { hashPassword } from "../src/server/password";

const adminEmail = "admin.platform@townpet.dev";
const adminPassword =
  process.env.E2E_ADMIN_PASSWORD ?? process.env.SEED_DEFAULT_PASSWORD ?? "townpet123";

async function loginAsAdmin(page: Page) {
  await page.goto("/login?next=%2Fadmin%2Fpolicies");
  await page.getByTestId("login-email").fill(adminEmail);
  await page.getByTestId("login-password").fill(adminPassword);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/admin\/policies/, { timeout: 20_000 });
  await page.waitForLoadState("networkidle");
}

let originalPolicy: Awaited<ReturnType<typeof getPopularPostPolicy>> | null = null;

test.describe("admin popular post policy form", () => {
  test.beforeAll(async () => {
    originalPolicy = await getPopularPostPolicy();
  });

  test.beforeEach(async () => {
    const passwordHash = await hashPassword(adminPassword);

    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        role: UserRole.ADMIN,
        emailVerified: new Date(),
        passwordHash,
      },
      create: {
        email: adminEmail,
        role: UserRole.ADMIN,
        emailVerified: new Date(),
        passwordHash,
      },
    });

    const result = await setPopularPostPolicy({ minLikes: 3 });
    if (!result.ok) {
      throw new Error("Failed to set baseline popular post policy.");
    }
  });

  test.afterAll(async () => {
    if (!originalPolicy) {
      return;
    }
    await setPopularPostPolicy(originalPolicy);
  });

  test("updates the popular promotion threshold and persists after reload", async ({ page }) => {
    await loginAsAdmin(page);

    const minLikes = page.getByTestId("popular-post-policy-min-likes");
    await expect(page.getByText("현재 적용: 좋아요 3개 이상")).toBeVisible();
    await expect(minLikes).toHaveValue("3");

    await minLikes.fill("5");
    await expect(page.getByText("저장 후 좋아요 5개 이상으로 변경됩니다.")).toBeVisible();
    await page.getByTestId("popular-post-policy-submit").click();

    await expect(page.getByTestId("popular-post-policy-success")).toContainText(
      "인기글 기준을 좋아요 5개 이상으로 저장했습니다.",
    );
    await expect(page.getByText("현재 적용: 좋아요 5개 이상")).toBeVisible();

    await page.reload();

    await expect(minLikes).toHaveValue("5");
    await expect(page.getByText("현재 적용: 좋아요 5개 이상")).toBeVisible();
  });

  test("shows local validation before calling the server action", async ({ page }) => {
    await loginAsAdmin(page);

    const minLikes = page.getByTestId("popular-post-policy-min-likes");
    await minLikes.fill("101");
    await page.getByTestId("popular-post-policy-submit").click();

    await expect(page.getByTestId("popular-post-policy-error")).toContainText(
      "좋아요 기준은 1~100 사이로 입력해 주세요.",
    );
  });
});
