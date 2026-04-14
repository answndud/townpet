import { expect, test, type Locator, type Page } from "@playwright/test";

import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/server/password";

const TEST_EMAIL = process.env.E2E_LOGIN_EMAIL ?? "e2e.editor@townpet.dev";
const TEST_PASSWORD =
  process.env.E2E_LOGIN_PASSWORD ?? process.env.SEED_DEFAULT_PASSWORD ?? "dev-password-1234";

async function loginAndOpenPostCreate(page: Page) {
  await page.goto("/login?next=%2Fposts%2Fnew");
  await page.getByTestId("login-email").fill(TEST_EMAIL);
  await page.getByTestId("login-password").fill(TEST_PASSWORD);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/posts\/new/, { timeout: 15_000 });
}

async function setEditorText(editor: Locator, text: string) {
  await editor.click();
  await editor.evaluate((element) => {
    element.innerHTML = "";
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward" }));
  });
  await editor.page().keyboard.type(text);
}

async function selectEditorText(editor: Locator, selectedText: string) {
  await editor.evaluate((element, targetText) => {
    (element as HTMLElement).focus();
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);

    while (walker.nextNode()) {
      const currentNode = walker.currentNode;
      const content = currentNode.textContent ?? "";
      const startIndex = content.indexOf(targetText);
      if (startIndex < 0) {
        continue;
      }

      const range = document.createRange();
      range.setStart(currentNode, startIndex);
      range.setEnd(currentNode, startIndex + targetText.length);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
      return;
    }

    throw new Error(`text not found: ${targetText}`);
  }, selectedText);
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

  test("applies font size and color to selected text without inserting placeholder text", async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();

    await setEditorText(editor, "alpha beta gamma");
    await selectEditorText(editor, "beta");
    await page.getByLabel("글자 크기").selectOption("18");

    await expect(editor).not.toContainText("텍스트");
    await expect(editor).toContainText("alpha beta gamma");
    await expect(editor.evaluate((element) => element.innerHTML)).resolves.toContain('data-size="18"');

    await selectEditorText(editor, "beta");
    await page.getByRole("button", { name: "파랑 색상" }).click();

    await expect(editor).not.toContainText("텍스트");
    await expect(editor.evaluate((element) => element.innerHTML)).resolves.toContain('data-color="#2563eb"');
  });

  test("applies blockquote to the selected text", async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();

    await setEditorText(editor, "quoted line");
    await selectEditorText(editor, "quoted line");
    await page.getByRole("button", { name: "인용" }).click();

    await expect(editor.evaluate((element) => element.innerHTML)).resolves.toContain("<blockquote>");
  });

  test("applies bullet and ordered lists to the selected text", async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();

    await setEditorText(editor, "first item");
    await selectEditorText(editor, "first item");
    await page.getByRole("button", { name: "글머리" }).click();
    await expect(editor.evaluate((element) => element.innerHTML)).resolves.toContain("<ul>");

    await setEditorText(editor, "ordered item");
    await selectEditorText(editor, "ordered item");
    await page.getByRole("button", { name: "번호" }).click();
    await expect(editor.evaluate((element) => element.innerHTML)).resolves.toContain("<ol>");
  });
});
