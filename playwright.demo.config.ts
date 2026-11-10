import { defineConfig } from "@playwright/test";
process.env.DEMO_E2E = "1";
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "demo.spec.ts",
  workers: 1,
  use: { headless: true },
  reporter: "list",
  webServer: {
    command: "npx vite --mode demo --host 127.0.0.1 --port 5175 --strictPort",
    url: "http://127.0.0.1:5175",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
