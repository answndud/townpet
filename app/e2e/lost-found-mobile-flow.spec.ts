import { expect, test } from "@playwright/test";
import {
  BoardScope,
  CommonBoardType,
  LostFoundStatus,
  LostFoundType,
  PostScope,
  PostStatus,
  PostType,
} from "@prisma/client";

import { prisma } from "../src/lib/prisma";

const E2E_AUTHOR_EMAIL = "e2e.lost-found.mobile@townpet.dev";

async function ensureAuthor() {
  return prisma.user.upsert({
    where: { email: E2E_AUTHOR_EMAIL },
    update: {
      nickname: "lost-mobile-e2e",
      emailVerified: new Date(),
    },
    create: {
      email: E2E_AUTHOR_EMAIL,
      nickname: "lost-mobile-e2e",
      emailVerified: new Date(),
    },
    select: { id: true },
  });
}

async function createLostFoundPost(runId: string) {
  const author = await ensureAuthor();
  const title = `[PW LOST] 모바일 분실동물 공유 ${runId}`;
  await prisma.post.deleteMany({
    where: {
      title: {
        startsWith: "[PW LOST] 모바일 분실동물 공유",
      },
    },
  });

  const post = await prisma.post.create({
    data: {
      authorId: author.id,
      boardScope: BoardScope.COMMON,
      commonBoardType: CommonBoardType.LOST_FOUND,
      type: PostType.LOST_FOUND,
      scope: PostScope.GLOBAL,
      status: PostStatus.ACTIVE,
      title,
      content: `${runId} 망원시장 근처에서 흰색 말티즈를 찾고 있습니다.`,
      structuredSearchText: `${title}\n${runId}\n흰색 말티즈 망원시장`,
      animalTags: ["강아지"],
      lostFoundAlert: {
        create: {
          alertType: LostFoundType.LOST,
          petType: "강아지",
          breed: "흰색 말티즈",
          lastSeenAt: new Date("2026-06-08T09:30:00.000Z"),
          lastSeenLocation: "서울 마포구 망원시장 근처",
          status: LostFoundStatus.ACTIVE,
        },
      },
    },
    select: { id: true, title: true },
  });

  return post;
}

test.describe("lost-found mobile flow", () => {
  test.setTimeout(60_000);

  test.afterEach(async () => {
    await prisma.post.deleteMany({
      where: {
        title: {
          startsWith: "[PW LOST] 모바일 분실동물 공유",
        },
      },
    });
  });

  test("connects landing, create entry, feed, share panel, and sighting comment UI", async ({ page }) => {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const post = await createLostFoundPost(runId);

    await page.setViewportSize({ width: 393, height: 852 });

    await page.goto("/lost-found");
    await expect(page.getByRole("link", { name: /분실\/목격 등록/ }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("link", { name: /전체 제보/ }).first()).toBeVisible();

    await page.goto("/lost/new");
    await expect(page).toHaveURL(/\/posts\/new\?type=LOST_FOUND&template=lost_pet/, {
      timeout: 15_000,
    });
    await expect(page.getByRole("heading", { name: "분실/목격 제보 작성" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("작성 전에 확인")).toBeVisible();

    await page.goto(`/feed/guest?type=LOST_FOUND&q=${encodeURIComponent(runId)}`);
    await expect(page.getByRole("link", { name: post.title })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto(`/posts/${post.id}/guest`);
    await expect(page.getByRole("heading", { name: post.title })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: /분실\/목격 공유 도구 열기/ }).click();
    await expect(page.getByText("카카오톡 문구 복사")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: /분실\/목격 전단 SVG 저장/ })).toBeVisible();
    await expect(page.getByText("저장 파일:")).toBeVisible();

    await page.locator("#comments").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "댓글 열기" }).click();
    await expect(page.getByText("목격 제보", { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("목격 위치", { exact: true })).toBeVisible();
    await expect(page.getByText("목격 시간", { exact: true })).toBeVisible();

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 2);
  });
});
