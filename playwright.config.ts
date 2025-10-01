import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /preferences\.(?:history\.gate|personalization\.routes)\.spec\.ts$/,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
  },
  webServer: {
    command: "pnpm exec next start --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_IGNORE_INCORRECT_LOCKFILE: "1",
      NEXT_PUBLIC_CHAT_UX_V2: "0",
    },
  },
});
