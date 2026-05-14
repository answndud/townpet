import { expect, type Locator, type Page } from "@playwright/test";

export async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(metrics.scrollWidth, "page should not create horizontal overflow").toBeLessThanOrEqual(
    metrics.clientWidth + 1,
  );
}

export async function expectTouchTarget(locator: Locator, label = "target", minHeight = 40) {
  await expect(locator, `${label} should be visible`).toBeVisible();
  const box = await locator.boundingBox();

  expect(box, `${label} should have a measurable layout box`).not.toBeNull();
  expect(box?.height ?? 0, `${label} should meet the 40px touch target height`).toBeGreaterThanOrEqual(
    minHeight,
  );
}
