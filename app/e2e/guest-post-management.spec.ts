import { expect, test, type Page } from "@playwright/test";

import { prisma } from "../src/lib/prisma";

const GUEST_NICKNAME = "비회원E2E";
const GUEST_PASSWORD = "1234";

async function setEditorText(page: Page, text: string) {
  const editor = page.getByTestId("post-body-editor").first();
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.type(text);
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

  throw new Error(`Created guest post not found by title: ${title}`);
}

test.describe("guest post management", () => {
  test.setTimeout(60_000);

  test("guest creates, edits, and deletes post with password", async ({ page }) => {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const title = `[PW] 비회원 글 ${runId}`;
    const updatedContent = `비회원 수정 본문 ${runId}`;

    await page.goto("/posts/new");
    await page.getByLabel("제목").fill(title);
    await expect(page.getByTestId("post-body-editor")).toBeVisible({ timeout: 15_000 });
    await setEditorText(page, `비회원 작성 본문 ${runId}`);
    await page.getByLabel("비회원 닉네임").fill(GUEST_NICKNAME);
    await page.getByLabel("글 비밀번호").fill(GUEST_PASSWORD);
    await page.getByRole("button", { name: "등록" }).click();

    await expect(page).toHaveURL(/\/feed/, { timeout: 15_000 });
    const createdPostId = await findPostIdByTitle(title);

    await page.goto(`/posts/${createdPostId}/guest`);
    await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 15_000 });

    await page.goto(
      `/posts/${createdPostId}/edit?guest=1&pw=${encodeURIComponent(GUEST_PASSWORD)}`,
    );
    await expect(page).toHaveURL(new RegExp(`/posts/${createdPostId}/edit`));

    await setEditorText(page, updatedContent);
    await page.getByLabel("글 비밀번호").fill(GUEST_PASSWORD);
    await Promise.all([
      page.waitForURL(new RegExp(`/posts/${createdPostId}$`), { timeout: 15_000 }),
      page.getByRole("button", { name: "수정 저장" }).click(),
    ]);
    await page.goto(`/posts/${createdPostId}/guest`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(updatedContent)).toBeVisible({ timeout: 15_000 });

    const deleteResponse = await page.request.delete(`/api/posts/${createdPostId}`, {
      data: { guestPassword: GUEST_PASSWORD },
      headers: {
        "x-guest-fingerprint": "e2e-guest-management",
      },
    });
    expect(deleteResponse.ok()).toBe(true);
    await page.goto("/feed");
    await expect(page).toHaveURL(/\/feed/);

    const deletedPost = await prisma.post.findUnique({
      where: { id: createdPostId },
      select: { status: true },
    });
    expect(deletedPost?.status).toBe("DELETED");
  });
});
