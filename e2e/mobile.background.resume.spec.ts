import { expect, test } from "@playwright/test";

test("mobile background resume completes without numeric errors", async ({ context, page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.route("**/api/chat", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ text: "Background response" }),
    });
  });

  await page.goto("/");

  const composer = page.getByRole("textbox", { name: /send a message/i });
  await composer.fill("Check background flow");
  await page.getByRole("button", { name: /send/i }).click();

  const otherTab = await context.newPage();
  await otherTab.goto("about:blank");
  await otherTab.close();

  await page.bringToFront();

  await expect(page.getByText("Background response")).toBeVisible();
  await expect(page.getByText(/500/)).toHaveCount(0);
  await expect(page.getByText("Network error")).toHaveCount(0);
});
