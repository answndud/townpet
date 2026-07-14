import { expect, test } from "@playwright/test";

const publicRoutes = [
  { path: "/", heading: "우리 동네 반려생활 정보" },
  { path: "/feed/guest", heading: "전체 게시판" },
  { path: "/lost-found", heading: "우리 동네 분실동물 제보를 빠르게 정리하고 공유하세요" },
  { path: "/login", heading: "로그인" },
  { path: "/corrections/new", heading: "정보 정정 요청" },
  { path: "/terms", heading: "이용약관" },
  { path: "/privacy", heading: "개인정보처리방침" },
  { path: "/commercial", heading: "광고·제휴 고지" },
];

test.describe("public surface smoke", () => {
  for (const route of publicRoutes) {
    test(`${route.path} renders its public heading without console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });

      const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });

      expect(response?.status()).toBeLessThan(400);
      await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test("guest feed can open a public post detail when content exists", async ({ page }) => {
    await page.goto("/feed/guest", { waitUntil: "domcontentloaded" });
    const postLinks = page.locator('a[href*="/posts/"][href$="/guest"]');
    const count = await postLinks.count();

    test.skip(count === 0, "No public post fixture is available in this environment.");
    await postLinks.first().click();
    await expect(page.locator("main")).toBeVisible();
    await expect(page).not.toHaveTitle(/error/i);
  });
});
