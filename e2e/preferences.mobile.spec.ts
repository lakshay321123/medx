import { expect, test } from "@playwright/test";

test("mobile sheet is stable and shows all options", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  // Open the mobile actions menu and navigate to settings
  await page.getByLabel(/open options/i).click();
  await page.getByRole("button", { name: /settings/i }).click();

  const dialog = page.getByRole("dialog", { name: /preferences/i });
  await expect(dialog).toBeVisible();

  const box1 = await dialog.boundingBox();
  expect(box1).not.toBeNull();
  const initialHeight = box1!.height;

  const tabs = page.getByRole("tab");
  const tabCount = await tabs.count();
  const limit = Math.min(3, tabCount);
  for (let i = 0; i < limit; i += 1) {
    await tabs.nth(i).click();
  }

  const box2 = await dialog.boundingBox();
  expect(box2).not.toBeNull();
  const newHeight = box2!.height;
  expect(Math.abs(initialHeight - newHeight)).toBeLessThan(2);

  await expect(page.getByRole("button", { name: /save changes/i })).toBeVisible();

  const beforeScroll = await page.evaluate(() => document.documentElement.scrollTop);
  await page.mouse.wheel(0, 2000);
  const afterScroll = await page.evaluate(() => document.documentElement.scrollTop);
  expect(afterScroll).toBe(beforeScroll);
});
