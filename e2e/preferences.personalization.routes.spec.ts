import { test, expect } from "@playwright/test";

async function intercept(page, path: string, assertBody: (b: any) => void) {
  await page.route(path, async (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      const b = req.postDataJSON();
      assertBody(b);
      const url = req.url();
      if (url.includes("/api/chat/stream")) {
        const payload = JSON.stringify({ choices: [{ delta: { content: "Mock response" } }] });
        await route.fulfill({
          status: 200,
          headers: {
            "content-type": "text/event-stream",
            connection: "keep-alive",
            "cache-control": "no-cache",
          },
          body: `data: ${payload}\n\n` + "data: [DONE]\n",
        });
      } else if (url.includes("/api/therapy")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ completion: "Therapy mock response", wrapup: "You got this." }),
        });
      } else if (url.includes("/api/ai-doc")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            plan: { steps: ["Stay hydrated", "Monitor symptoms"] },
            rulesFired: [],
            softAlerts: [],
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, text: "Mock response", threadId: "test-thread" }),
        });
      }
      return;
    }
    await route.continue();
  });
}

test.describe("Personalization payload across routes", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("secondopinion.consent.v1.0", "true");
      window.localStorage.setItem(
        "secondopinion.cookies.v1.0",
        JSON.stringify({
          essential: true,
          analytics: false,
          functional: false,
          marketing: false,
        }),
      );
    });
    await page.route("**/api/profile", async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ profile: {} }) });
        return;
      }
      if (method === "POST" || method === "PUT") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
        return;
      }
      await route.continue();
    });
    await page.route("**/api/medx", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
        return;
      }
      await route.continue();
    });
    await page.goto("/");
    await page.getByRole("button", { name: /preferences/i }).click();
    await page.getByRole("tab", { name: /personalization/i }).click();
    await page.getByRole("checkbox", { name: /enable customization/i }).check();
    await page.getByRole("button", { name: /witty/i }).click();
    await page.getByLabel(/custom instructions/i).fill("Be innovative and think outside the box.");
    await page.getByRole("button", { name: /save/i }).click();
  });

  test("Chat / Therapy / AI-Doc carry personalization + lang", async ({ page }) => {
    await intercept(page, "**/api/chat/stream",  (b) => {
      expect(b.personalization?.enabled).toBe(true);
      expect(typeof b.lang).toBe("string");
      expect(b.provider).toBe("openai");
      expect(typeof b.model).toBe("string");
    });
    await intercept(page, "**/api/therapy", (b) => { expect(b.personalization?.enabled).toBe(true); expect(typeof b.lang).toBe("string"); });
    await intercept(page, "**/api/ai-doc", (b) => { expect(b.personalization?.enabled).toBe(true); expect(typeof b.lang).toBe("string"); });

    const sendButton = page.getByRole("button", { name: /^Send$/i });

    // Chat send
    const chatComposer = page.getByPlaceholder(/send a message/i);
    await chatComposer.click();
    await chatComposer.type("Hydration benefits?");
    await expect(chatComposer).toHaveValue("Hydration benefits?");
    await expect(sendButton).toBeEnabled();
    await sendButton.click();
    await expect(page.getByTestId("assistant-turn").first()).toBeVisible();

    // Therapy send
    await page.getByRole("button", { name: /^Therapy$/i }).click();
    const therapyComposer = page.getByPlaceholder(/send a message/i);
    await therapyComposer.click();
    await therapyComposer.type("I feel overwhelmed.");
    await expect(therapyComposer).toHaveValue("I feel overwhelmed.");
    await expect(sendButton).toBeEnabled();
    await sendButton.click();
    await expect(page.getByTestId("assistant-turn").first()).toBeVisible();

    // AI-Doc send
    await page.getByRole("button", { name: /AI Doc/i }).click();
    const docComposer = page.getByPlaceholder(/send a message/i);
    await docComposer.click();
    await docComposer.type("Explain CBC basics.");
    await expect(docComposer).toHaveValue("Explain CBC basics.");
    await expect(sendButton).toBeEnabled();
    await sendButton.click();
    await expect(page.getByTestId("assistant-turn").first()).toBeVisible();
  });
});
