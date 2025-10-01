import { test, expect } from "@playwright/test";

async function intercept(page, path: string, assertBody: (b: any) => void) {
  await page.route(path, async (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      const b = req.postDataJSON();
      assertBody(b);
    }
    await route.continue();
  });
}

test.describe("Personalization payload across routes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /preferences/i }).click();
    await page.getByRole("tab", { name: /personalization/i }).click();
    await page.getByRole("switch", { name: /enable customization/i }).check();
    await page.getByRole("button", { name: /witty/i }).click();
    await page.getByLabel(/custom instructions/i).fill("Be innovative and think outside the box.");
    await page.getByRole("button", { name: /save/i }).click();
  });

  test("Chat / Therapy / AI-Doc carry personalization + lang", async ({ page }) => {
    await intercept(page, "**/api/chat",  (b) => { expect(b.personalization?.enabled).toBe(true); expect(typeof b.lang).toBe("string"); });
    await intercept(page, "**/api/therapy", (b) => { expect(b.personalization?.enabled).toBe(true); expect(typeof b.lang).toBe("string"); });
    await intercept(page, "**/api/ai-doc", (b) => { expect(b.personalization?.enabled).toBe(true); expect(typeof b.lang).toBe("string"); });

    // Chat send
    await page.getByRole("textbox", { name: /send a message/i }).fill("Hydration benefits?");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("assistant-turn").first()).toBeVisible();

    // Therapy send
    await page.getByRole("tab", { name: /therapy/i }).click();
    await page.getByRole("textbox").fill("I feel overwhelmed.");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("assistant-turn").first()).toBeVisible();

    // AI-Doc send
    await page.getByRole("tab", { name: /ai[- ]?doc/i }).click();
    await page.getByRole("textbox").fill("Explain CBC basics.");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("assistant-turn").first()).toBeVisible();
  });
});
