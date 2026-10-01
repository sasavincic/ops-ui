import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { ROOT } from "./source-files";

// Theme variables the library makes every app declare (styling programme §4.6, item 6). An app's
// Tailwind scans the vendored src/** (comments included) and emits a theme variable for every
// class that reads one, so a library class that names a size an app never renders still shows in
// that app's G3 token dump. 1.5.0's AppFrame named both content widths (max-w-5xl / max-w-6xl):
// every app declared both container variables. 1.6.0 writes the widths as values. This test pins
// the container sizes the library declares; a new one needs a reason here (prefer a spacing step
// or an arbitrary value: DESIGN.md "Library classes and theme variables").

const require = createRequire(import.meta.url);
const tailwind = require("@tailwindcss/postcss") as (options: { base: string; optimize: boolean }) => unknown;
const postcss = createRequire(require.resolve("@tailwindcss/postcss"))("postcss") as (plugins: unknown[]) => {
  process: (css: string, options: { from: string }) => Promise<{ css: string }>;
};

const SANDBOX = mkdtempSync(path.join(os.tmpdir(), "ops-ui-theme-vars-"));
afterAll(() => rmSync(SANDBOX, { recursive: true, force: true }));

/** Compiles what an app compiles from the library alone: Tailwind, tokens.css and a scan of src/**. */
async function declaredThemeVariables() {
  symlinkSync(path.join(ROOT, "node_modules"), path.join(SANDBOX, "node_modules"), "dir");
  const css = `@import "tailwindcss";\n@import "${path.join(ROOT, "styles/tokens.css")}";\n@source "${path.join(ROOT, "src")}";\n`;
  const from = path.join(SANDBOX, "globals.css");
  writeFileSync(from, css);
  const out = (await postcss([tailwind({ base: SANDBOX, optimize: false })]).process(css, { from })).css;
  const theme = out.slice(out.indexOf("@layer theme"), out.indexOf("@layer base"));
  return new Set([...theme.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
}

describe("theme variables the library declares in every app", () => {
  it("the container sizes are exactly the ones the kit and its stories use; never the shell's content widths", async () => {
    const names = await declaredThemeVariables();
    const containers = [...names].filter((n) => n.startsWith("--container-")).sort();
    // max-w-xs / sm / md (Dialog) / xl / 2xl / 3xl: kit components and stories.
    expect(containers).toEqual(["--container-2xl", "--container-3xl", "--container-md", "--container-sm", "--container-xl", "--container-xs"]);
    expect(names.has("--container-5xl")).toBe(false);
    expect(names.has("--container-6xl")).toBe(false);
  }, 60_000);
});
