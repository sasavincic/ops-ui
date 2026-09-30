import { PNG } from "pngjs";

/**
 * How a shot is compared with its baseline (spec §11.2): exactly. Rendering is fully pinned
 * (Chromium 1194, DPR 1, fonts from the geist package, reduced motion, a fixed and paused clock),
 * so an unchanged story paints the same bytes, and any tolerance only hides real changes.
 *
 * Two layers, because Playwright's comparator alone is not exact:
 * - `SHOT_COMPARISON` is what `toHaveScreenshot` gets. It still does the useful work (waits for two
 *   identical screenshots in a row, writes baselines under `shots:accept`, reports a diff image),
 *   and with pixelmatch's threshold 0.1 a whole-page swap of one token for its neighbour (primary
 *   for primary-hover, bg for surface) counted as 0 changed pixels, so the threshold is 0.
 * - `exactDiff` is the gate. Playwright calls pixelmatch without `includeAA`, so every pixel it
 *   classifies as anti-aliased is skipped at ANY threshold: a filled button's corner radius
 *   6px → 7px changed 51 raw pixels and counted 0, and lightening every glyph edge of a baseline
 *   counts 0. `exactDiff` compares every RGBA byte. `gallery/tests/shots.spec.ts` runs it after each
 *   `toHaveScreenshot`, `tests/shot-comparator.test.ts` proves both layers refuse one token step and
 *   that an edge-only change passes Playwright but not `exactDiff`, and tools/app-shots.mjs
 *   (spec §11.4) uses `exactDiff` as its comparison.
 */
export const SHOT_COMPARISON = { maxDiffPixels: 0, threshold: 0 } as const;

export type ExactDiff = {
  /** Pixels whose RGBA bytes differ (every pixel when the sizes differ). */
  changed: number;
  /** "expected WxH, received WxH" when the sizes differ, else null. */
  sizeMismatch: string | null;
  /** A PNG of the expected image faded out, with every changed pixel red; null when identical. */
  diff: Buffer | null;
};

/** Compares two PNG screenshots byte for byte (decoded RGBA, so the PNG encoding never matters). */
export function exactDiff(actualPng: Buffer, expectedPng: Buffer): ExactDiff {
  const actual = PNG.sync.read(actualPng);
  const expected = PNG.sync.read(expectedPng);
  if (actual.width !== expected.width || actual.height !== expected.height) {
    return {
      changed: Math.max(actual.width * actual.height, expected.width * expected.height),
      sizeMismatch: `expected ${expected.width}x${expected.height}, received ${actual.width}x${actual.height}`,
      diff: null,
    };
  }
  if (actual.data.equals(expected.data)) return { changed: 0, sizeMismatch: null, diff: null };
  const diff = new PNG({ width: expected.width, height: expected.height });
  let changed = 0;
  for (let i = 0; i < expected.data.length; i += 4) {
    const same =
      actual.data[i] === expected.data[i] &&
      actual.data[i + 1] === expected.data[i + 1] &&
      actual.data[i + 2] === expected.data[i + 2] &&
      actual.data[i + 3] === expected.data[i + 3];
    if (same) {
      // The expected image, faded to a tenth of its contrast, so the red stands out.
      const grey = 255 - Math.round((255 - (0.299 * expected.data[i] + 0.587 * expected.data[i + 1] + 0.114 * expected.data[i + 2])) * 0.1);
      diff.data[i] = diff.data[i + 1] = diff.data[i + 2] = grey;
    } else {
      changed += 1;
      diff.data[i] = 255;
      diff.data[i + 1] = 0;
      diff.data[i + 2] = 0;
    }
    diff.data[i + 3] = 255;
  }
  return { changed, sizeMismatch: null, diff: PNG.sync.write(diff) };
}
