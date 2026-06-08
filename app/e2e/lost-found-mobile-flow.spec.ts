import { expect, test, type Page } from "@playwright/test";
import {
  BoardScope,
  CommonBoardType,
  CommentKind,
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

async function openCommentComposer(page: Page) {
  const rootInput = page.getByTestId("post-comment-root-input");
  await page.locator("#comments").scrollIntoViewIfNeeded();
  if (await rootInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    return;
  }

  const toggle = page.getByRole("button", { name: "댓글 열기" });
  if (await toggle.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await toggle.click();
  }
  await expect(rootInput).toBeVisible({ timeout: 15_000 });
}

test.describe("lost-found mobile flow", () => {
  test.setTimeout(90_000);

  test.afterEach(async () => {
    await prisma.post.deleteMany({
      where: {
        title: {
          startsWith: "[PW LOST] 모바일 분실동물 공유",
        },
      },
    });
  });

  test("connects landing, create entry, feed, and share panel on mobile", async ({ page }) => {
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

    const viewRecorded = page
      .waitForResponse((response) => response.url().includes(`/api/posts/${post.id}/view`), {
        timeout: 10_000,
      })
      .catch(() => null);
    await page.goto(`/posts/${post.id}/guest`);
    await expect(page.getByRole("heading", { name: post.title })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: /분실\/목격 공유 도구 열기/ }).click();
    await expect(page.getByText("카카오톡 문구 복사")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: /분실\/목격 전단 SVG 저장/ })).toBeVisible();
    await expect(page.getByText("저장 파일:")).toBeVisible();
    await viewRecorded;

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 2);
  });

  test("submits and persists a guest sighting comment on mobile", async ({ page }) => {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const post = await createLostFoundPost(runId);
    const sightingLocation = `망원 한강공원 입구 ${runId}`;
    const sightingSeenAt = "2026-06-08T18:40";
    const sightingContent = `흰색 말티즈가 북쪽 산책로 방향으로 이동했습니다 ${runId}`;

    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto(`/posts/${post.id}/guest#comments`);
    await openCommentComposer(page);

    await expect(page.getByText("목격 제보", { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });
    await page.getByTestId("post-comment-guest-name").fill("목격자");
    await page.getByTestId("post-comment-guest-password").fill(`pw-${runId}`);
    await page.getByTestId("lost-found-sighting-location").fill(sightingLocation);
    await page.getByTestId("lost-found-sighting-seen-at").fill(sightingSeenAt);
    await page.getByTestId("post-comment-root-input").fill(sightingContent);
    await page.getByTestId("post-comment-root-submit").click();

    await expect(
      page.getByText("목격 제보가 등록되었습니다. 공개 댓글에서 위치와 시간을 확인할 수 있습니다."),
    ).toBeVisible({
      timeout: 15_000,
    });
    const createdSighting = page
      .locator("[data-testid^='post-comment-item-']")
      .filter({ hasText: sightingContent })
      .first();
    await expect(createdSighting).toBeVisible();
    await expect(createdSighting.getByText(sightingLocation)).toBeVisible();
    await expect(createdSighting.getByText("목격 시간", { exact: true })).toBeVisible();

    const storedComment = await prisma.comment.findFirst({
      where: {
        postId: post.id,
        content: sightingContent,
      },
      select: {
        kind: true,
        sightingLocation: true,
        sightingSeenAt: true,
        isPrivateSighting: true,
        post: {
          select: { commentCount: true },
        },
      },
    });
    expect(storedComment).not.toBeNull();
    expect(storedComment?.kind).toBe(CommentKind.LOST_FOUND_SIGHTING);
    expect(storedComment?.sightingLocation).toBe(sightingLocation);
    expect(storedComment?.sightingSeenAt?.getTime()).toBe(new Date(sightingSeenAt).getTime());
    expect(storedComment?.isPrivateSighting).toBe(false);
    expect(storedComment?.post.commentCount).toBe(1);

    await page.goto(`/feed/guest?type=LOST_FOUND&q=${encodeURIComponent(runId)}`);
    const feedCard = page.getByTestId("feed-post-item").filter({ hasText: post.title }).first();
    await expect(feedCard).toBeVisible({ timeout: 15_000 });
    await expect(feedCard.getByText("댓글 1")).toBeVisible();

    await page.goto(`/lost-found?e2e=${encodeURIComponent(runId)}`);
    const landingCard = page.getByTestId(`lost-found-recent-post-${post.id}`);
    await expect(landingCard).toBeVisible({ timeout: 15_000 });
    await expect(landingCard.getByText("댓글 1")).toBeVisible();

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 2);
  });

  test("hides private sighting location and photo from public guest detail", async ({ page }) => {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const post = await createLostFoundPost(runId);
    const privateLocation = `비공개 위치 ${runId}`;
    const privateImageUrl = `https://example.com/private-sighting-${runId}.jpg`;
    const sightingSeenAt = "2026-06-08T19:15";
    const sightingContent = `보호자에게만 전달할 목격 단서 ${runId}`;

    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto(`/posts/${post.id}/guest#comments`);
    await openCommentComposer(page);

    await page.getByTestId("post-comment-guest-name").fill("목격자");
    await page.getByTestId("post-comment-guest-password").fill(`pw-${runId}`);
    await page.getByTestId("lost-found-sighting-location").fill(privateLocation);
    await page.getByTestId("lost-found-sighting-seen-at").fill(sightingSeenAt);
    await page.getByTestId("lost-found-sighting-image-url").fill(privateImageUrl);
    await page.getByLabel("위치/사진은 보호자에게만 공개").check();
    await page.getByTestId("post-comment-root-input").fill(sightingContent);
    await page.getByTestId("post-comment-root-submit").click();

    await expect(page.getByText("목격 제보가 등록되었습니다. 위치와 사진은 보호자에게만 공개됩니다.")).toBeVisible({
      timeout: 15_000,
    });
    const privateSighting = page
      .locator("[data-testid^='post-comment-item-']")
      .filter({ hasText: "보호자에게만 공개된 목격 제보입니다." })
      .first();
    await expect(privateSighting).toBeVisible();
    await expect(privateSighting.getByText("보호자 공개")).toBeVisible();
    await expect(privateSighting.getByText(privateLocation)).toHaveCount(0);
    await expect(privateSighting.getByText("사진 열기")).toHaveCount(0);
    await expect(page.getByText(privateImageUrl)).toHaveCount(0);

    const storedComment = await prisma.comment.findFirst({
      where: {
        postId: post.id,
        content: sightingContent,
      },
      select: {
        kind: true,
        sightingLocation: true,
        sightingImageUrl: true,
        isPrivateSighting: true,
      },
    });
    expect(storedComment).not.toBeNull();
    expect(storedComment?.kind).toBe(CommentKind.LOST_FOUND_SIGHTING);
    expect(storedComment?.sightingLocation).toBe(privateLocation);
    expect(storedComment?.sightingImageUrl).toBe(privateImageUrl);
    expect(storedComment?.isPrivateSighting).toBe(true);
  });
});
