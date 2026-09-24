import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "playwright/test";

// Confine profiles to this test process; do not change the user's environment.
const temporary = resolve(".cache/qa/tmp");
mkdirSync(temporary, { recursive: true });
process.env.TEMP = process.env.TMP = process.env.TMPDIR = temporary;

const baseURL =
  process.env.TEST_BASE_URL ?? "http://127.0.0.1:4173/kuto-ladder/";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: ".cache/qa/results",
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: ".cache/qa/report", open: "never" }],
  ],
  use: {
    baseURL,
    headless: true,
    colorScheme: "light",
    reducedMotion: "reduce",
    viewport: { width: 375, height: 800 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : {
        command: "bun run preview",
        url: baseURL,
        reuseExistingServer: false,
        timeout: 30_000,
      },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
    { name: "msedge", use: { browserName: "chromium", channel: "msedge" } },
    {
      name: "performance",
      testDir: "./tests/performance",
      use: {
        browserName: "chromium",
        channel: "msedge",
        viewport: { width: 1280, height: 900 },
        trace: "off",
      },
    },
  ],
});
