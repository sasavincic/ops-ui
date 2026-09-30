/**
 * How a shot is compared with its baseline (spec §11.2): exactly. Rendering is fully pinned
 * (Chromium 1194, DPR 1, fonts from the geist package, reduced motion, a fixed and paused clock),
 * so an unchanged story paints the same bytes, and any tolerance only hides real changes: with
 * pixelmatch's threshold 0.1 a whole-page swap of one token for its neighbour (primary for
 * primary-hover, bg for surface) counted as 0 changed pixels. tests/shot-comparator.test.ts
 * repaints baselines by one token step and requires Playwright's own comparator, with these
 * options, to refuse them. tools/app-shots.mjs (spec §11.4) uses the same numbers.
 */
export const SHOT_COMPARISON = { maxDiffPixels: 0, threshold: 0 } as const;
