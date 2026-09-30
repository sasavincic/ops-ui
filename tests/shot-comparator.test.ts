import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { SHOT_COMPARISON } from "../gallery/shot-options";
import { parseColour } from "../sync/sync-ops-ui.mjs";
import { ROOT, readSource } from "./source-files";

// The shot gate's own tolerance, proved (spec §11.2): Playwright's comparator, with the options
// `pnpm shots` uses, must refuse a baseline repainted by ONE token step. With pixelmatch's
// threshold 0.1 every case below passed as "0 changed pixels", so a kit edit that swapped
// bg-primary for bg-primary-hover (or dropped a tint) would have shipped as a patch.

const require = createRequire(import.meta.url);
const testPkg = path.dirname(require.resolve("@playwright/test/package.json"));
const playwright = path.dirname(require.resolve("playwright/package.json", { paths: [testPkg] }));
const core = path.dirname(require.resolve("playwright-core/package.json", { paths: [playwright] }));
const { getComparator } = require(path.join(core, "lib/server/utils/comparators.js")) as {
  getComparator: (mime: string) => (actual: Buffer, expected: Buffer, options?: object) => { errorMessage: string } | null;
};
const compare = getComparator("image/png");

/** The 8-bit sRGB pixel a CSS colour paints (parseColour gives linear light). */
function pixel(css: string): [number, number, number] {
  const colour = parseColour(css);
  if (!colour) throw new Error(`cannot read ${css}`);
  const encode = (c: number) => {
    const v = Math.min(1, Math.max(0, c));
    return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
  };
  return colour.rgb.map(encode) as [number, number, number];
}

const BRAND = new Map(
  [...readSource("gallery/brands/workforce.css").matchAll(/(--brand-[a-z-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
);
const token = (name: string) => pixel(BRAND.get(name) ?? (name === "--color-bg" ? "oklch(1 0 0)" : "?"));

/** A baseline with every pixel of `from` (±1 per channel) repainted as `to`. */
function repaint(file: string, from: [number, number, number], to: [number, number, number]) {
  const png = PNG.sync.read(readFileSync(path.join(ROOT, "gallery/__screenshots__", file)));
  let count = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    if ([0, 1, 2].every((c) => Math.abs(png.data[i + c] - from[c]) <= 1)) {
      png.data[i] = to[0];
      png.data[i + 1] = to[1];
      png.data[i + 2] = to[2];
      count += 1;
    }
  }
  return { count, buffer: PNG.sync.write(png) };
}

const baseline = (file: string) => readFileSync(path.join(ROOT, "gallery/__screenshots__", file));

describe("the shot comparison is exact", () => {
  it("options: 0 changed pixels, no per-pixel tolerance, and the config uses them unchanged", () => {
    expect(SHOT_COMPARISON).toEqual({ maxDiffPixels: 0, threshold: 0 });
    const config = readSource("gallery/playwright.config.ts");
    expect(config).toContain("toHaveScreenshot: { ...SHOT_COMPARISON,");
    expect(config.replace(/\/\/[^\n]*/g, "")).not.toMatch(/threshold|maxDiffPixel|comparator/);
  });

  it("an unchanged baseline passes", () => {
    const png = baseline("1440/workforce/button--matrix.png");
    expect(compare(png, png, SHOT_COMPARISON)).toBeNull();
  });

  const steps: { name: string; file: string; from: [number, number, number]; to: [number, number, number] }[] = [
    { name: "primary → primary-hover", file: "1440/workforce/button--matrix.png", from: token("--brand-primary"), to: token("--brand-primary-hover") },
    { name: "primary lightness 0.45 → 0.46", file: "1440/workforce/button--matrix.png", from: token("--brand-primary"), to: pixel("oklch(0.46 0.12 250)") },
    { name: "bg → surface", file: "1440/workforce/callout--tones.png", from: token("--color-bg"), to: token("--brand-surface") },
    { name: "surface → surface-raised", file: "1440/workforce/table--rows.png", from: token("--brand-surface"), to: token("--brand-surface-raised") },
    { name: "border lightness 0.9 → 0.89", file: "1440/workforce/table--rows.png", from: token("--brand-border"), to: pixel("oklch(0.89 0.006 250)") },
  ];
  it.each(steps)("a baseline repainted $name is refused", ({ file, from, to }) => {
    const { count, buffer } = repaint(file, from, to);
    expect(count, "the baseline holds pixels of the token").toBeGreaterThan(20);
    const result = compare(buffer, baseline(file), SHOT_COMPARISON);
    expect(result?.errorMessage).toMatch(/pixels .* are different/);
  });
});
