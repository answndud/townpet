import { expect, test, type Page } from "@playwright/test";

import { prisma } from "../src/lib/prisma";
import { loginWithCredentialsApi } from "./support/auth-helpers";
import { hashPassword } from "../src/server/password";

const TEST_EMAIL = process.env.E2E_LOGIN_EMAIL ?? "e2e.upload@townpet.dev";
const TEST_PASSWORD =
  process.env.E2E_LOGIN_PASSWORD ?? process.env.SEED_DEFAULT_PASSWORD ?? "dev-password-1234";

const SAMPLE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5n6gAAAABJRU5ErkJggg==";

async function setEditorText(page: Page, text: string) {
  const editor = page.getByTestId("post-body-editor").first();
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.type(text);
}

async function uploadImagesThroughEditor(
  page: Page,
  files: Array<{ name: string; mimeType: string; buffer: Buffer }>,
) {
  await page.getByRole("button", { name: "이미지" }).click();
  const dialog = page.locator(".se-dialog-image.se-dialog-content").last();
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("post-editor-image-file-input").last().setInputFiles(files);
  await dialog.locator("button[type='submit']").click();
  const loadingBox = page.locator(".se-loading-box");
  if (await loadingBox.count()) {
    await loadingBox.waitFor({ state: "hidden", timeout: 15_000 });
  }
}

async function deleteFirstEditorImage(page: Page) {
  const editor = page.getByTestId("post-body-editor").first();
  await editor.evaluate((element) => {
    const image = element.querySelector("img");
    if (!(element instanceof HTMLElement) || !image) {
      return;
    }

    element.focus();
    const range = document.createRange();
    range.selectNode(image);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await page.keyboard.press("Backspace");
}

async function findPostIdByTitle(title: string, timeoutMs = 15_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const post = await prisma.post.findFirst({
      where: { title },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (post) {
      return post.id;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Created post not found by title: ${title}`);
}

async function loginAndOpenPostCreate(page: Page) {
  await loginWithCredentialsApi(page, {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    next: "/posts/new",
  });
  await expect(page).toHaveURL(/\/posts\/new/, { timeout: 15_000 });
  await expect(page.getByTestId("post-body-editor")).toBeVisible({ timeout: 15_000 });
}

test.describe("image upload flow", () => {
  test.setTimeout(60_000);

  test.beforeAll(async () => {
    const passwordHash = await hashPassword(TEST_PASSWORD);

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

    const user = await prisma.user.upsert({
      where: { email: TEST_EMAIL },
      update: {
        emailVerified: new Date(),
        passwordHash,
        nickname: "e2e-upload",
      },
      create: {
        email: TEST_EMAIL,
        emailVerified: new Date(),
        passwordHash,
        nickname: "e2e-upload",
      },
      select: { id: true },
    });

    await prisma.userNeighborhood.upsert({
      where: {
        userId_neighborhoodId: {
          userId: user.id,
          neighborhoodId: neighborhood.id,
        },
      },
      update: { isPrimary: true },
      create: {
        userId: user.id,
        neighborhoodId: neighborhood.id,
        isPrimary: true,
      },
    });
  });

  test("syncs attachments between create-edit-detail", async ({
    page,
  }) => {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const title = `[PW] 이미지 업로드 ${runId}`;
    const content = `이미지 업로드 E2E 검증 본문 ${runId}`;
    const fileA = `upload-a-${runId}.png`;
    const fileB = `upload-b-${runId}.png`;

    await loginAndOpenPostCreate(page);

    await page.getByLabel("제목").fill(title);
    await setEditorText(page, content);
    await uploadImagesThroughEditor(page, [
      {
        name: fileA,
        mimeType: "image/png",
        buffer: Buffer.from(SAMPLE_PNG_BASE64, "base64"),
      },
      {
        name: fileB,
        mimeType: "image/png",
        buffer: Buffer.from(SAMPLE_PNG_BASE64, "base64"),
      },
    ]);

    await expect(page.getByTestId("post-body-editor").locator("img")).toHaveCount(2, { timeout: 15_000 });
    await page.getByRole("button", { name: "등록" }).click();

    await expect(page).toHaveURL(/\/feed/, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");
    const createdPostId = await findPostIdByTitle(title);
    await page.goto(`/posts/${createdPostId}`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp(`/posts/${createdPostId}$`));
    await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("article img")).toHaveCount(2, { timeout: 15_000 });
    await expect(page.getByText("첨부 이미지")).toHaveCount(0);

    await page.goto(`/posts/${createdPostId}/edit`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp(`/posts/${createdPostId}/edit$`));
    await expect(page.getByTestId("post-body-editor")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("post-body-editor").locator("img")).toHaveCount(2, { timeout: 15_000 });
    await deleteFirstEditorImage(page);
    await expect(page.getByTestId("post-body-editor").locator("img")).toHaveCount(1, { timeout: 15_000 });
    await Promise.all([
      page.waitForURL(new RegExp(`/posts/${createdPostId}$`), { timeout: 15_000 }),
      page.getByRole("button", { name: "수정 저장" }).click(),
    ]);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("article img")).toHaveCount(1, { timeout: 15_000 });
    await expect(page.getByText("첨부 이미지")).toHaveCount(0);

    page.once("dialog", (dialog) => {
      void dialog.accept();
    });
    await page.getByRole("button", { name: "삭제" }).click();

    await page.waitForURL(/\/feed/, { timeout: 15_000 });
    await expect(page.getByText(title)).toHaveCount(0);
  });
});
