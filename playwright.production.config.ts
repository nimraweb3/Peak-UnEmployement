import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e", testMatch: "production-public.spec.ts", workers:1,
  use: { baseURL: "https://peak-unemployment.vercel.app", browserName:"chromium", channel: process.env.PLAYWRIGHT_CHANNEL, trace:"retain-on-failure" },
});
