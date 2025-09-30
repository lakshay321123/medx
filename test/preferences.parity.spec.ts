import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { PREF_SECTIONS } from "../components/settings/prefs.schema";

async function collectRows(page: Page) {
  const rows = await page.$$('[data-pref-row]');
  const results: Array<{ id: string; text: string }> = [];
  for (const row of rows) {
    const id = await row.getAttribute("data-pref-row");
    if (!id) continue;
    const text = (await row.innerText()).trim();
    results.push({ id, text });
  }
  return results;
}

test.describe("preferences layout parity", () => {
  test("desktop and mobile have matching rows", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/?panel=settings");

    const desktopMap = new Map<string, string>();
    for (const section of PREF_SECTIONS) {
      const button = page.locator("aside nav button", { hasText: section.titleKey });
      await button.click();
      const rows = await collectRows(page);
      for (const row of rows) {
        desktopMap.set(row.id, row.text);
      }
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?panel=settings");

    const mobileMap = new Map<string, string>();
    for (const section of PREF_SECTIONS) {
      const tab = page.locator("nav button", { hasText: section.titleKey }).first();
      await tab.click();
      const rows = await collectRows(page);
      for (const row of rows) {
        mobileMap.set(row.id, row.text);
      }
    }

    expect(Array.from(mobileMap.keys()).sort()).toEqual(
      Array.from(desktopMap.keys()).sort(),
    );
    expect(Array.from(mobileMap.values())).toEqual(Array.from(desktopMap.values()));
  });
});
