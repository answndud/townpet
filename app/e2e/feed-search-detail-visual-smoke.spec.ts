import { expect, test } from "@playwright/test";
import { PostScope, PostStatus, PostType } from "@prisma/client";

import { prisma } from "../src/lib/prisma";
import { expectNoHorizontalOverflow, expectTouchTarget } from "./support/visual-smoke-helpers";

const VISUAL_AUTHOR_EMAIL = "e2e.visual-smoke@townpet.dev";
const TITLE_PREFIX = "[VISUAL SMOKE]";

type SeededVisualPost = {
  id: string;
  title: string;
  token: string;
};

let seededPost: SeededVisualPost;

async function seedVisualSmokePost() {
  const token = `VISUAL${Date.now()}`;
  const author = await prisma.user.upsert({
    where: { email: VISUAL_AUTHOR_EMAIL },
    update: {
      nickname: "visual-smoke",
      emailVerified: new Date(),
    },
    create: {
      email: VISUAL_AUTHOR_EMAIL,
      nickname: "visual-smoke",
      emailVerified: new Date(),
    },
    select: { id: true },
  });

  await prisma.post.deleteMany({
    where: {
      authorId: author.id,
      title: {
        startsWith: TITLE_PREFIX,
      },
    },
  });

  const post = await prisma.post.create({
    data: {
      authorId: author.id,
      title: `${TITLE_PREFIX} ${token}`,
      content: `${token} feed search detail visual smoke 본문입니다.`,
      type: PostType.FREE_POST,
      scope: PostScope.GLOBAL,
      status: PostStatus.ACTIVE,
    },
    select: { id: true, title: true },
  });

  return {
    id: post.id,
    title: post.title,
    token,
  };
}

test.describe("feed/search/detail visual smoke", () => {
  test.beforeAll(async () => {
    seededPost = await seedVisualSmokePost();
  });

  test("keeps guest feed and footer search controls usable across desktop and mobile", async ({
    page,
  }) => {
    for (const viewport of [
      { width: 1280, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(`/feed/guest?q=${seededPost.token}&searchIn=TITLE&density=ULTRA`);

      await expect(page.getByTestId("feed-post-list")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("link", { name: seededPost.title })).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await expectTouchTarget(page.getByRole("link", { name: "전체글" }), "feed all tab");
      await expectTouchTarget(page.getByRole("link", { name: "베스트글" }), "feed best tab");
      await expectTouchTarget(page.getByRole("link", { name: "최신" }), "feed latest sort");
      await expectTouchTarget(page.getByRole("link", { name: "좋아요" }), "feed like sort");
      await expectTouchTarget(page.getByRole("link", { name: "댓글" }), "feed comment sort");

      const footerSearch = page.locator('form[aria-label="피드 하단 게시글 검색"]');
      await expectTouchTarget(footerSearch.locator('select[name="searchIn"]'), "footer search scope");
      await expectTouchTarget(footerSearch.locator('input[name="q"]'), "footer search query");
      await expectTouchTarget(footerSearch.getByRole("button", { name: "검색" }), "footer search button");
      await expectTouchTarget(footerSearch.getByRole("link", { name: "초기화" }), "footer reset link");
    }
  });

  test("keeps guest post detail primary actions usable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/posts/${seededPost.id}/guest`);

    await expect(page.getByRole("heading", { name: seededPost.title })).toBeVisible({
      timeout: 15_000,
    });
    await expectNoHorizontalOverflow(page);
    await expectTouchTarget(page.getByRole("button", { name: "목록으로" }), "detail back button");
    await expectTouchTarget(page.getByRole("button", { name: /좋아요/ }).first(), "detail like button");
    await expectTouchTarget(
      page.locator("summary").filter({ hasText: "게시글 신고" }),
      "detail report summary",
    );
  });
});
