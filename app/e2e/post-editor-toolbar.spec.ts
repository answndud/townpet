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

async function readEditorSegments(editor: Locator) {
  return editor.evaluate((element) => {
    const segments: Array<{
      text: string;
      size: string | null;
      color: string | null;
      href: string | null;
    }> = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);

    while (walker.nextNode()) {
      const currentNode = walker.currentNode;
      const text = (currentNode.textContent ?? "").replace(/\u200b/g, "");
      if (text.trim().length === 0) {
        continue;
      }

      const parentElement = currentNode.parentElement;
      const sizeSpan = parentElement?.closest("span[data-size]") as HTMLElement | null;
      const colorSpan = parentElement?.closest("span[data-color]") as HTMLElement | null;
      const link = parentElement?.closest("a") as HTMLAnchorElement | null;

      segments.push({
        text,
        size: sizeSpan?.dataset.size ?? null,
        color: colorSpan?.dataset.color ?? null,
        href: link?.getAttribute("href") ?? null,
      });
    }

    return segments;
  });
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
    const fontSizeSelect = page.getByLabel("글자 크기");

    await setEditorText(editor, "beta");
    await editor.selectText();
    await fontSizeSelect.click();
    await fontSizeSelect.selectOption("18");

    await expect(editor).not.toContainText("텍스트");
    await expect(editor).toContainText("beta");
    await expect(editor.evaluate((element) => element.innerHTML)).resolves.toContain('data-size="18"');

    await editor.selectText();
    await page.getByRole("button", { name: "파랑 색상" }).click();
    await expect(editor.evaluate((element) => element.innerHTML)).resolves.toContain('data-color="#2563eb"');

    await editor.click();
    await expect(fontSizeSelect).toHaveValue("14");
    await page.keyboard.type(" delta");

    await expect(editor).not.toContainText("텍스트");
    const segments = await readEditorSegments(editor);
    expect(segments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: "beta", size: "18", color: "#2563eb" }),
        expect.objectContaining({ text: " delta", size: null, color: null }),
      ]),
    );
  });

  test("applies links to the selected text", async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();

    await setEditorText(editor, "link me");
    await editor.selectText();
    page.once("dialog", (dialog) => {
      void dialog.accept("https://example.com");
    });
    await page.getByRole("button", { name: "링크" }).click();

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
    const editor = page.locator('[contenteditable="true"]').first();

    await setEditorText(editor, "quoted line");
    await editor.selectText();
    await page.getByRole("button", { name: "인용" }).click();

    await expect(editor.evaluate((element) => element.innerHTML)).resolves.toContain("<blockquote>");
  });

  test("applies bullet and ordered lists to the selected text", async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();

    await setEditorText(editor, "first item");
    await editor.selectText();
    await page.getByRole("button", { name: "글머리" }).click();
    await expect(editor.evaluate((element) => element.innerHTML)).resolves.toContain("<ul>");

    await setEditorText(editor, "ordered item");
    await editor.selectText();
    await page.getByRole("button", { name: "번호" }).click();
    await expect(editor.evaluate((element) => element.innerHTML)).resolves.toContain("<ol>");
  });
});
