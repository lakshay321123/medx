import { test, expect } from "@playwright/test";

test("History OFF excludes prior turns; ON includes", async ({ page }) => {
  await page.goto("/");
  // seed some history
  await page.getByRole("textbox", { name: /send a message/i }).fill("Seed history 1");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("assistant-turn").first()).toBeVisible();

  // Turn OFF history
  await page.getByRole("button", { name: /preferences/i }).click();
  await page.getByRole("tab", { name: /personalization/i }).click();
  await page.getByRole("switch", { name: /allow history/i }).uncheck();
  await page.getByRole("button", { name: /save/i }).click();

  // Intercept to assert empty/absent history
  await page.route("**/api/chat", async (route) => {
    const b = route.request().postDataJSON();
    expect(!b.history || b.history.length === 0).toBeTruthy();
    await route.continue();
  });

  await page.getByRole("textbox").fill("Follow-up (should ignore earlier context)");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("assistant-turn").first()).toBeVisible();

  // Turn ON history
  await page.getByRole("button", { name: /preferences/i }).click();
  await page.getByRole("tab", { name: /personalization/i }).click();
  await page.getByRole("switch", { name: /allow history/i }).check();
  await page.getByRole("button", { name: /save/i }).click();

  // Intercept to assert history present
  await page.route("**/api/chat", async (route) => {
    const b = route.request().postDataJSON();
    expect(Array.isArray(b.history) && b.history.length >= 1).toBeTruthy();
    await route.continue();
  });

  await page.getByRole("textbox").fill("Another follow-up (should include previous turns)");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("assistant-turn").first()).toBeVisible();
});
