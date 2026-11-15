import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  testIgnore: "production-public.spec.ts",
  testMatch: process.env.LIVE_E2E ? "live.spec.ts" : "public.spec.ts",
  use: { baseURL: "http://127.0.0.1:5173" },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
