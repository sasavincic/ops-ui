import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import { SHOT_COMPARISON, exactDiff } from "../gallery/shot-options";
import { parseColour } from "../sync/sync-ops-ui.mjs";
import { ROOT, readSource } from "./source-files";

// The shot gate's own tolerance, proved (spec §11.2). Both layers of gallery/shot-options.ts must
// refuse a baseline repainted by ONE token step: Playwright's comparator with the options
// `pnpm shots` gives `toHaveScreenshot` (with pixelmatch's threshold 0.1 every step below passed
// as "0 changed pixels"), and `exactDiff`, the gate itself. Playwright's comparator skips every
// pixel it takes for anti-aliasing at any threshold, so an edge-only change (a corner radius, a
// font weight) passes it: `exactDiff`, run after every toHaveScreenshot, is what refuses that.

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

  it("the shot matrix runs the exact comparison after every toHaveScreenshot", () => {
    const spec = readSource("gallery/tests/shots.spec.ts");
    const shots = spec.match(/await expect\(page\)\.toHaveScreenshot\(([^,]+), [^\n]*\n\s*await expectExactShot\(page, testInfo, ([^)]+)\)/g) ?? [];
    expect(shots.length).toBe((spec.match(/toHaveScreenshot\(/g) ?? []).length);
    expect(shots.length).toBeGreaterThan(0);
    expect(spec).toMatch(/const result = exactDiff\(actual, baseline\);/);
  });

  it("an unchanged baseline passes", () => {
    const png = baseline("1440/workforce/button--matrix.png");
    expect(compare(png, png, SHOT_COMPARISON)).toBeNull();
    expect(exactDiff(png, png)).toEqual({ changed: 0, sizeMismatch: null, diff: null });
  });

  const steps: { name: string; file: string; from: [number, number, number]; to: [number, number, number] }[] = [
    { name: "primary → primary-hover", file: "1440/workforce/button--matrix.png", from: token("--brand-primary"), to: token("--brand-primary-hover") },
    { name: "primary lightness 0.45 → 0.46", file: "1440/workforce/button--matrix.png", from: token("--brand-primary"), to: pixel("oklch(0.46 0.12 250)") },
    { name: "bg → surface", file: "1440/workforce/callout--tones.png", from: token("--color-bg"), to: token("--brand-surface") },
    { name: "surface → surface-raised", file: "1440/workforce/table--rows.png", from: token("--brand-surface"), to: token("--brand-surface-raised") },
    { name: "border lightness 0.9 → 0.89", file: "1440/workforce/table--rows.png", from: token("--brand-border"), to: pixel("oklch(0.89 0.006 250)") },
  ];
  // Decoding, repainting and comparing whole-page PNGs takes seconds on a loaded machine (load 30 on
  // 4 cores timed out at vitest's 5 s): a timeout, never a looser comparison.
  const PNG_WORK = 60_000;
  it.each(steps)("a baseline repainted $name is refused", ({ file, from, to }) => {
    const { count, buffer } = repaint(file, from, to);
    expect(count, "the baseline holds pixels of the token").toBeGreaterThan(20);
    const result = compare(buffer, baseline(file), SHOT_COMPARISON);
    expect(result?.errorMessage).toMatch(/pixels .* are different/);
    expect(exactDiff(buffer, baseline(file)).changed).toBe(count);
  }, PNG_WORK);

  it.each(["1440/workforce/button--matrix.png", "375/finaops/dialog--form.png"])(
    "%s with every glyph and corner edge lightened: Playwright's comparator lets it through, exactDiff refuses it",
    (file) => {
      const { count, buffer } = lightenEdges(file);
      expect(count, "the baseline has anti-aliased edges").toBeGreaterThan(500);
      // The construction is edge-only: Playwright's comparator, with the options toHaveScreenshot
      // gets, reports nothing. This is why the exact comparison runs after it.
      expect(compare(buffer, baseline(file), SHOT_COMPARISON)).toBeNull();
      const exact = exactDiff(buffer, baseline(file));
      expect(exact.changed).toBe(count);
      expect(exact.sizeMismatch).toBeNull();
      expect(exact.diff).not.toBeNull();
    },
    PNG_WORK,
  );

  it("a size change is refused", () => {
    const png = PNG.sync.read(baseline("1440/workforce/button--matrix.png"));
    const taller = new PNG({ width: png.width, height: png.height + 1 });
    png.data.copy(taller.data);
    const exact = exactDiff(PNG.sync.write(taller), baseline("1440/workforce/button--matrix.png"));
    expect(exact.sizeMismatch).toBe(`expected ${png.width}x${png.height}, received ${png.width}x${png.height + 1}`);
    expect(exact.changed).toBeGreaterThan(0);
  });
});

/**
 * A baseline with its anti-aliased edges lightened, and nothing else: every pixel lying between a
 * darker and a lighter neighbour (a glyph or corner edge) is raised by 12 levels, then any pixel
 * Playwright's comparator counts as a real difference is put back, until it counts none. What is
 * left is the kind of change a corner radius or a thinner font makes.
 */
function lightenEdges(file: string) {
  const expected = baseline(file);
  const base = PNG.sync.read(expected);
  const edited = PNG.sync.read(expected);
  const { width, height } = base;
  const lum = (i: number) => 0.299 * base.data[i] + 0.587 * base.data[i + 1] + 0.114 * base.data[i + 2];
  const touched = new Set<number>();
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      let darker = 0;
      let lighter = 0;
      let same = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const n = lum(((y + dy) * width + x + dx) * 4);
          if (n < lum(i)) darker += 1;
          else if (n > lum(i)) lighter += 1;
          else same += 1;
        }
      }
      if (darker && lighter && same <= 2) {
        for (let c = 0; c < 3; c++) edited.data[i + c] = Math.min(255, base.data[i + c] + 12);
        touched.add(i);
      }
    }
  }
  for (let round = 0; round < 10; round++) {
    const result = compare(PNG.sync.write(edited), expected, SHOT_COMPARISON) as { diff?: Buffer } | null;
    if (!result) break;
    const diff = PNG.sync.read(result.diff as Buffer);
    for (const i of touched) {
      // Playwright's diff paints a counted pixel red and a skipped (anti-aliased) one yellow.
      if (diff.data[i] === 255 && diff.data[i + 1] === 0 && diff.data[i + 2] === 0) {
        for (let c = 0; c < 3; c++) edited.data[i + c] = base.data[i + c];
        touched.delete(i);
      }
    }
  }
  let count = 0;
  for (let i = 0; i < base.data.length; i += 4) {
    if ([0, 1, 2, 3].some((c) => edited.data[i + c] !== base.data[i + c])) count += 1;
  }
  return { count, buffer: PNG.sync.write(edited) };
}
