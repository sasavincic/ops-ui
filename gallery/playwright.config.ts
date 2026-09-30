import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "@playwright/test";
import { SHOT_PROJECTS } from "./shot-matrix";
import { SHOT_COMPARISON } from "./shot-options";

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
  // Baselines: gallery/__screenshots__/<project>/<brand>/<story>.png. Only `pnpm shots:accept`
  // writes them: Playwright's default ("missing") would write a baseline nobody accepted the first
  // time a new shot runs, and pass against it from then on, so a plain `pnpm shots` writes nothing
  // (the CLI's --update-snapshots of shots:accept overrides this). tests/baselines.test.ts keeps
  // the files equal to the matrix, so a missing or orphaned baseline is red.
  updateSnapshots: "none",
  snapshotPathTemplate: "{testDir}/../__screenshots__/{projectName}/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: [["list"]],
  expect: {
    // Exact (shot-options.ts): no tolerance, so a one-step colour change is never "0 changed pixels".
    toHaveScreenshot: { ...SHOT_COMPARISON, animations: "disabled", caret: "hide" },
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    browserName: "chromium",
    deviceScaleFactor: 1,
    contextOptions: { reducedMotion: "reduce" },
  },
  // 1440, 375 and 375-touch (a phone: touch, a coarse pointer, no hover): gallery/shot-matrix.ts.
  projects: SHOT_PROJECTS.map((project) => ({ name: project.name, use: { ...project.use } })),
  // A production build of the gallery: what the shots compare is never a dev overlay.
  webServer: {
    command: `pnpm gallery:build && pnpm exec next start gallery --port ${PORT} --hostname 127.0.0.1`,
    cwd: repoRoot,
    url: `http://127.0.0.1:${PORT}/workforce`,
    reuseExistingServer: false,
    stdout: "pipe",
    timeout: 240_000,
  },
});
