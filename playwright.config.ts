import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/ui",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:6006",
    browserName: "chromium",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command:
      "corepack pnpm exec vite preview --outDir storybook-static --host 127.0.0.1 --port 6006 --strictPort",
    url: "http://127.0.0.1:6006/iframe.html",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
