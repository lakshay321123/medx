import { expect, test } from "@playwright/test";

test("retry recovers assistant turn without duplicates", async ({ page }) => {
  let callCount = 0;

  await page.route("**/api/chat", async route => {
    callCount += 1;
    if (callCount === 1) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "fail" }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ text: "Recovered answer" }),
    });
  });

  await page.goto("/");

  const composer = page.getByRole("textbox", { name: /send a message/i });
  await composer.fill("Trigger error");
  await page.getByRole("button", { name: /send/i }).click();

  const errorBubble = page.getByText("Network error");
  await expect(errorBubble).toBeVisible();
  const retryButton = page.getByRole("button", { name: /retry/i });
  await expect(retryButton).toBeVisible();

  await retryButton.click();

  await expect.poll(() => callCount).toBe(2);
  await expect(page.getByText("Recovered answer")).toHaveCount(1);
  await expect(page.getByText("Network error")).toHaveCount(0);
});
