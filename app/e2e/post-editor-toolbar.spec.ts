import { expect, test, type Locator, type Page } from "@playwright/test";

import { prisma } from "../src/lib/prisma";
import { loginWithCredentialsApi } from "./support/auth-helpers";
import { hashPassword } from "../src/server/password";

const TEST_EMAIL = process.env.E2E_LOGIN_EMAIL ?? "e2e.editor@townpet.dev";
const TEST_PASSWORD =
  process.env.E2E_LOGIN_PASSWORD ?? process.env.SEED_DEFAULT_PASSWORD ?? "dev-password-1234";

async function loginAndOpenPostCreate(page: Page) {
  await loginWithCredentialsApi(page, {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    next: "/posts/new",
  });
  await expect(page).toHaveURL(/\/posts\/new/, { timeout: 15_000 });
  await expect(page.getByTestId("post-body-editor")).toBeVisible({ timeout: 15_000 });
}

async function setEditorText(editor: Locator, text: string) {
  await editor.click();
  await editor.page().keyboard.press("ControlOrMeta+A");
  await editor.page().keyboard.press("Backspace");
  await editor.page().keyboard.type(text);
}

async function readEditorSegments(editor: Locator) {
  return editor.evaluate((element) => {
    const segments: Array<{
      text: string;
      size: string | null;
      href: string | null;
    }> = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);

    while (walker.nextNode()) {
      const currentNode = walker.currentNode;
      const text = (currentNode.textContent ?? "")
        .replace(/\u200b/g, "")
        .replace(/\u00a0/g, " ");
      if (text.trim().length === 0) {
        continue;
      }

      const parentElement = currentNode.parentElement;
      const sizeSpan = parentElement?.closest("span[data-size], span[style*='font-size']") as HTMLElement | null;
      const link = parentElement?.closest("a") as HTMLAnchorElement | null;

      segments.push({
        text,
        size: sizeSpan?.dataset.size ?? (sizeSpan?.style.fontSize?.replace("px", "") || null),
        href: link?.getAttribute("href") ?? null,
      });
    }

    return segments;
  });
}

async function selectEditorText(editor: Locator, text: string) {
  await editor.evaluate((element, targetText) => {
    if (element instanceof HTMLElement) {
      element.focus();
    }

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const currentNode = walker.currentNode;
      const currentText = currentNode.textContent ?? "";
      const startOffset = currentText.indexOf(targetText);
      if (startOffset < 0) {
        continue;
      }

      const range = document.createRange();
      range.setStart(currentNode, startOffset);
      range.setEnd(currentNode, startOffset + targetText.length);

      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      return;
    }

    throw new Error(`Text not found in editor: ${targetText}`);
  }, text);
}

test.describe("post editor toolbar", () => {
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
        nickname: "e2e-editor",
      },
      create: {
        email: TEST_EMAIL,
        emailVerified: new Date(),
        passwordHash,
        nickname: "e2e-editor",
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

  test.beforeEach(async ({ page }) => {
    await loginAndOpenPostCreate(page);
  });

  test("applies font size without inserting placeholder text", async ({ page }) => {
    const editor = page.getByTestId("post-body-editor").first();

    await setEditorText(editor, "beta");
    await selectEditorText(editor, "beta");
    await page.getByRole("button", { name: "크기" }).click();
    await page.getByRole("button", { name: "18px" }).last().click();

    await expect(editor).not.toContainText("텍스트");
    await expect(editor).toContainText("beta");

    const styledSegments = await readEditorSegments(editor);
    expect(styledSegments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: "beta", size: "18" }),
      ]),
    );

    await editor.click();
    await page.keyboard.type(" delta");

    await expect(editor).not.toContainText("텍스트");
    const segments = await readEditorSegments(editor);
    expect(segments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: "beta", size: "18" }),
        expect.objectContaining({ text: " delta", size: null }),
      ]),
    );
  });

  test("applies links to the selected text", async ({ page }) => {
    const editor = page.getByTestId("post-body-editor").first();

    await setEditorText(editor, "link me");
    await selectEditorText(editor, "link me");
    await page.getByRole("button", { name: "링크" }).click();
    await page
      .locator('.se-dialog-content[style*="display: block"] input.se-input-url')
      .first()
      .fill("https://example.com");
    await page
      .locator('.se-dialog-content[style*="display: block"] button[type="submit"]')
      .click();

    const segments = await readEditorSegments(editor);
    expect(segments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: "link me",
          href: "https://example.com",
        }),
      ]),
    );
  });

  test("applies blockquote to the selected text", async ({ page }) => {
    const editor = page.getByTestId("post-body-editor").first();

    await setEditorText(editor, "quoted line");
    await selectEditorText(editor, "quoted line");
    await page.getByRole("button", { name: "인용문" }).click();

    await expect(editor.evaluate((element) => element.innerHTML)).resolves.toContain("<blockquote>");
  });

  test("applies bullet and ordered lists to the selected text", async ({ page }) => {
    const editor = page.getByTestId("post-body-editor").first();

    await setEditorText(editor, "first item");
    await selectEditorText(editor, "first item");
    await page.getByRole("button", { name: "리스트" }).click();
    await page.getByRole("button", { name: "원형 리스트" }).last().click();
    await expect(editor.evaluate((element) => element.innerHTML)).resolves.toContain("<ul>");

    await setEditorText(editor, "ordered item");
    await selectEditorText(editor, "ordered item");
    await page.getByRole("button", { name: "리스트" }).click();
    await page.getByRole("button", { name: "숫자형 리스트" }).last().click();
    await expect(editor.evaluate((element) => element.innerHTML)).resolves.toContain("<ol>");
  });
});
