import { expect, test } from "@playwright/test";

test("assistant retry reuses last request", async ({ page }) => {
  let callCount = 0;

  await page.route("**/api/chat", async (route) => {
    callCount += 1;
    if (callCount === 1) {
      await route.fulfill({
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "fail" }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "All good" }),
    });
  });

  await page.goto("/chat");

  const composer = page.getByLabel(/send a message/i);
  await composer.fill("test retry flow");
  await page.getByRole("button", { name: /send/i }).click();

  const errorBubble = page.getByText("Network error");
  await expect(errorBubble).toBeVisible();
  const retryButton = page.getByRole("button", { name: /retry/i });
  await expect(retryButton).toBeVisible();

  await retryButton.click();

  await expect(errorBubble).toBeHidden();
  await expect(page.getByText("All good")).toBeVisible();
  await expect(page.locator("text=Network error")).toHaveCount(0);
  expect(callCount).toBe(2);
});
