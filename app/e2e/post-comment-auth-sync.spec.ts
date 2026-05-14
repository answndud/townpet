import { expect, test } from "@playwright/test";
import { PostScope, PostType } from "@prisma/client";

import { prisma } from "../src/lib/prisma";
import { createPost } from "../src/server/services/post.service";
import {
  getNewUserSafetyPolicy,
  setNewUserSafetyPolicy,
} from "../src/server/queries/policy.queries";
import {
  ensureCredentialUser,
  loginWithCredentialsApi,
} from "./support/auth-helpers";

test.describe("post comment auth sync", () => {
  test("updates the comment composer across tabs when auth state changes", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const runId = `pw-comment-auth-${Date.now()}`;
    const email = `${runId}@townpet.dev`;
    const originalPolicy = await getNewUserSafetyPolicy();
    const user = await ensureCredentialUser({
      email,
      nicknamePrefix: "e2e-comment-auth",
    });
    const category = await prisma.communityCategory.upsert({
      where: { slug: "e2e-hotpath" },
      update: { isActive: true },
      create: {
        slug: "e2e-hotpath",
        labelKo: "E2E",
        sortOrder: 999,
        isActive: true,
      },
      select: { id: true },
    });
    const community = await prisma.community.upsert({
      where: { slug: "e2e-hotpath" },
      update: { isActive: true, categoryId: category.id },
      create: {
        slug: "e2e-hotpath",
        labelKo: "E2E",
        categoryId: category.id,
        isActive: true,
        sortOrder: 999,
        defaultPostTypes: [PostType.FREE_BOARD],
      },
      select: { id: true },
    });

    const context = await browser.newContext();
    const primaryPage = await context.newPage();
    const secondaryPage = await context.newPage();
    const commentBody = `Playwright comment auth sync ${runId}`;
    let postId: string | null = null;

    try {
      await setNewUserSafetyPolicy({
        minAccountAgeHours: 0,
        restrictedPostTypes: [],
        contactBlockWindowHours: 0,
      });

      const post = await createPost({
        authorId: user.id,
        input: {
          title: `[PW COMMENT AUTH] ${runId}`,
          content: `Playwright comment auth sync setup ${runId}`,
          type: PostType.FREE_BOARD,
          scope: PostScope.GLOBAL,
          petTypeId: community.id,
          imageUrls: [],
        },
      });
      postId = post.id;

      await loginWithCredentialsApi(primaryPage, {
        email,
        next: "/feed",
      });

      await expect(
        primaryPage.locator('[data-testid="auth-logout-button"]:visible'),
      ).toBeVisible({
        timeout: 10_000,
      });
      await Promise.allSettled([
        primaryPage.goto(`/posts/${post.id}`, {
          waitUntil: "domcontentloaded",
        }),
        primaryPage.waitForURL(new RegExp(`/posts/${post.id}$`), {
          timeout: 10_000,
        }),
      ]);
      await expect(primaryPage).toHaveURL(new RegExp(`/posts/${post.id}$`));
      await expect(
        primaryPage.locator('[data-testid="auth-logout-button"]:visible'),
      ).toBeVisible({
        timeout: 10_000,
      });
      await expect(primaryPage.getByTestId("post-comment-root-input")).toBeVisible({
        timeout: 15_000,
      });
      await expect(primaryPage.getByTestId("post-comment-guest-name")).toHaveCount(0);
      await expect(primaryPage.getByTestId("post-comment-guest-password")).toHaveCount(0);

      await secondaryPage.goto("/feed");
      await expect(
        secondaryPage.locator('[data-testid="auth-logout-button"]:visible'),
      ).toBeVisible();
      await secondaryPage.locator('[data-testid="auth-logout-button"]:visible').click();

      await expect(secondaryPage.locator('[data-testid="header-login-link"]:visible')).toBeVisible({
        timeout: 10_000,
      });
      await expect(primaryPage.locator('[data-testid="header-login-link"]:visible')).toBeVisible({
        timeout: 10_000,
      });
      await expect(primaryPage.getByTestId("post-comment-guest-name")).toBeVisible({
        timeout: 10_000,
      });
      await expect(primaryPage.getByTestId("post-comment-guest-password")).toBeVisible();

      await loginWithCredentialsApi(secondaryPage, {
        email,
        next: "/feed",
      });
      await expect(secondaryPage).toHaveURL(/\/feed(?:\?.*)?$/);
      await expect(
        primaryPage.locator('[data-testid="auth-logout-button"]:visible'),
      ).toBeVisible({
        timeout: 10_000,
      });

      await expect(primaryPage.getByTestId("post-comment-root-input")).toBeVisible({
        timeout: 10_000,
      });
      await expect(primaryPage.getByTestId("post-comment-guest-name")).toHaveCount(0, {
        timeout: 10_000,
      });
      await expect(primaryPage.getByTestId("post-comment-guest-password")).toHaveCount(0, {
        timeout: 10_000,
      });

      await primaryPage.getByTestId("post-comment-root-input").fill(commentBody);
      await primaryPage.getByTestId("post-comment-root-submit").click();
      await expect(primaryPage.getByText(commentBody)).toBeVisible();
    } finally {
      await context.close();
      await setNewUserSafetyPolicy(originalPolicy);
      if (postId) {
        const cleanupPostId = postId;
        await prisma.$transaction(async (tx) => {
          await tx.notification.deleteMany({
            where: { postId: cleanupPostId },
          });
          await tx.comment.deleteMany({
            where: { postId: cleanupPostId },
          });
          await tx.post.deleteMany({
            where: { id: cleanupPostId },
          });
        });
      }
    }
  });
});
