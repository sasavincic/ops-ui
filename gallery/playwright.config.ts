import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "@playwright/test";

// Pinned browser: @playwright/test is pinned to exactly 1.56.1 in package.json,
// which drives Chromium revision 1194 (preinstalled under /opt/pw-browsers).
// Never run `playwright install`; moving Playwright or Chromium is a
// `shots: rebaseline (<reason>)` commit (spec §4.1).
export const CHROMIUM_REVISION = "1194";
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync("/opt/pw-browsers")) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = "/opt/pw-browsers";
}

const PORT = 3310;
const repoRoot = path.join(__dirname, "..");

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  // Baselines: gallery/__screenshots__/<width>/<brand>/<story>.png. Only
  // `pnpm shots:accept` writes them.
  snapshotPathTemplate: "{testDir}/../__screenshots__/{projectName}/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: [["list"]],
  expect: {
    toHaveScreenshot: { maxDiffPixels: 0, threshold: 0.1, animations: "disabled", caret: "hide" },
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    browserName: "chromium",
    deviceScaleFactor: 1,
    contextOptions: { reducedMotion: "reduce" },
  },
  projects: [
    { name: "1440", use: { viewport: { width: 1440, height: 900 } } },
    { name: "375", use: { viewport: { width: 375, height: 812 } } },
  ],
  // A production build of the gallery: what the shots compare is never a dev overlay.
  webServer: {
    command: `pnpm gallery:build && pnpm exec next start gallery --port ${PORT} --hostname 127.0.0.1`,
    cwd: repoRoot,
    url: `http://127.0.0.1:${PORT}/workforce`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
