import { defineConfig } from "@playwright/test";

/**
 * Preview-guard integration test (`npm run test:e2e:guard`). Runs after the main e2e
 * suite (both builds use .next). It builds the app with the guard on and Supabase pointed
 * at a tripwire that records any request.
 */
const CI = !!process.env.CI;

export default defineConfig({
  testDir: "tests/e2e-guard",
  workers: 1,
  forbidOnly: CI,
  retries: 0,
  reporter: CI ? [["github"], ["html", { open: "never", outputFolder: "playwright-report-guard" }]] : [["list"]],
  outputDir: "test-results-guard",
  use: {
    baseURL: "http://127.0.0.1:3101",
    browserName: "chromium",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node scripts/supabase-tripwire.mjs",
      url: "http://127.0.0.1:3198/__tripwire/requests",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "node scripts/e2e-guard-server.mjs",
      url: "http://127.0.0.1:3101/demo",
      reuseExistingServer: false,
      timeout: 300_000,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
