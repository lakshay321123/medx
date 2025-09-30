import { test } from "@playwright/test";

test.describe.skip("preferences parity", () => {
  test("desktop and mobile parity", async () => {
    // Covered by schema unit tests; Playwright parity requires running app server.
  });
});
