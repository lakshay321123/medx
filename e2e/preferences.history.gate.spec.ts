import { test, expect } from "@playwright/test";

test("History OFF excludes prior turns; ON includes", async ({ page }) => {
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
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, sections: {} }) });
      return;
    }
    await route.continue();
  });

  let callCount = 0;
  await page.route("**/api/chat/stream", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    callCount += 1;
    const body = route.request().postDataJSON();
    if (callCount === 2) {
      expect(body.allowHistory).toBe(false);
      const latest = Array.isArray(body.messages) ? body.messages[body.messages.length - 1] : null;
      expect(typeof latest?.content === "string" && !latest.content.includes("CONTEXT (recent conversation)"))
        .toBeTruthy();
    }
    if (callCount === 3) {
      expect(body.allowHistory).not.toBe(false);
      const latest = Array.isArray(body.messages) ? body.messages[body.messages.length - 1] : null;
      expect(typeof latest?.content === "string" && latest.content.includes("CONTEXT (recent conversation)"))
        .toBeTruthy();
    }
    const payload = JSON.stringify({ choices: [{ delta: { content: `Mock reply ${callCount}` } }] });
    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        connection: "keep-alive",
        "cache-control": "no-cache",
      },
      body: `data: ${payload}\n\n` + "data: [DONE]\n",
    });
  });

  await page.goto("/");

  // seed some history
  const composer = page.getByRole("textbox", { name: /send a message/i });
  await composer.click();
  await composer.type("Seed history 1");
  await expect(composer).toHaveValue("Seed history 1");
  const sendButton = page.getByRole("button", { name: /^Send$/i });
  await expect(sendButton).toBeEnabled();
  await sendButton.click();
  await expect(page.getByTestId("assistant-turn").first()).toBeVisible();

  // Turn OFF history
  await page.getByRole("button", { name: /preferences/i }).click();
  await page.getByRole("tab", { name: /personalization/i }).click();
  await page.getByRole("checkbox", { name: /reference chat history/i }).uncheck();
  await page.getByRole("button", { name: /save/i }).click();

  {
    const followUpComposer = page.getByPlaceholder(/send a message/i);
    await followUpComposer.click();
    await followUpComposer.type("Follow-up (should ignore earlier context)");
    await expect(followUpComposer).toHaveValue("Follow-up (should ignore earlier context)");
  }
  await expect(sendButton).toBeEnabled();
  await sendButton.click();
  await expect(page.getByTestId("assistant-turn").first()).toBeVisible();

  // Turn ON history
  await page.getByRole("button", { name: /preferences/i }).click();
  await page.getByRole("tab", { name: /personalization/i }).click();
  await page.getByRole("checkbox", { name: /reference chat history/i }).check();
  await page.getByRole("button", { name: /save/i }).click();

  {
    const historyOnComposer = page.getByPlaceholder(/send a message/i);
    await historyOnComposer.click();
    await historyOnComposer.type("Another follow-up (should include previous turns)");
    await expect(historyOnComposer).toHaveValue("Another follow-up (should include previous turns)");
  }
  await expect(sendButton).toBeEnabled();
  await sendButton.click();
  await expect(page.getByTestId("assistant-turn").first()).toBeVisible();
});
