import { defineConfig } from "@playwright/test";

const PORT = 3100;
const CI = !!process.env.CI;

export default defineConfig({
  testDir: "tests/e2e",
  // The local-Supabase spec shares one database; demo specs are independent but cheap.
  workers: 1,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    browserName: "chromium",
    // Phone-sized, as the app is designed for (CONVENTIONS: 390 px).
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    // Builds and starts its own production server on the local stack. It never reuses a
    // server that happens to be running (a dev server could point anywhere).
    command: "node scripts/e2e-server.mjs",
    url: `http://127.0.0.1:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
