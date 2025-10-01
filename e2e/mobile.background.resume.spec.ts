import { expect, test } from "@playwright/test";

test("mobile background resume keeps response clean", async ({ context, page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.route("**/api/chat", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Background ok" }),
    });
  });

  await page.goto("/chat");
  const composer = page.getByLabel(/send a message/i);
  await composer.fill("check resume");
  await page.getByRole("button", { name: /send/i }).click();

  const other = await context.newPage();
  await other.goto("about:blank");
  await page.bringToFront();

  await expect(page.getByText("Background ok")).toBeVisible();
  await expect(page.locator("text=500")).toHaveCount(0);
  await expect(page.locator("text=429")).toHaveCount(0);
  await other.close();
});
