// 1.5.0: moved whole from workforce-ops origin/main (96b4c7a) src/lib/pull-to-search.ts (identical in fina-ops origin/main).

/**
 * Pull-to-search (Saša, 2026-09-22): on phones, dragging the page down from
 * its very top opens the global search — the iOS home-screen gesture. The
 * numbers here are the whole feel of it, kept pure so they are testable:
 *
 * - The pull must be EXAGGERATED (a long finger travel) so it never fires
 *   from an ordinary scroll bounce, and the content follows the finger with
 *   resistance so it reads as a deliberate, elastic act, not a bug.
 * - Direction is decided early: a mostly-horizontal start is not a pull.
 */

/** Finger travel (px) at which releasing opens the search. */
export const PULL_TRIGGER_TRAVEL = 150;
/** Travel before the gesture counts as a pull at all (scroll-bounce guard). */
export const PULL_START_SLOP = 10;
/** The content never moves further than this, however far the finger goes. */
export const PULL_MAX_OFFSET = 120;
const RESISTANCE = 0.6;

/** How far the content moves for a given finger travel (0 for a push up). */
export function pullOffset(travel: number): number {
  if (travel <= 0) return 0;
  const linear = travel * RESISTANCE;
  // Past the trigger the pull keeps stiffening towards the cap.
  const soft = PULL_MAX_OFFSET - PULL_MAX_OFFSET / (1 + linear / PULL_MAX_OFFSET);
  return Math.min(linear, soft + Math.min(linear, PULL_MAX_OFFSET) * 0.35, PULL_MAX_OFFSET);
}

/** 0 → 1 across the travel needed to arm the gesture. */
export function pullProgress(travel: number): number {
  return Math.max(0, Math.min(1, travel / PULL_TRIGGER_TRAVEL));
}

export function isPullArmed(travel: number): boolean {
  return travel >= PULL_TRIGGER_TRAVEL;
}

export type PullIntent = "undecided" | "pull" | "not_a_pull";

/**
 * Decide, from the first meaningful movement, whether a touch is a pull.
 * Mostly-sideways movement (a swipe between tabs, a carousel) is never one;
 * a pull needs the finger to have gone down by the slop first.
 */
export function pullIntent(dx: number, dy: number): PullIntent {
  const ax = Math.abs(dx);
  if (ax > PULL_START_SLOP && ax > dy) return "not_a_pull";
  if (dy > PULL_START_SLOP && dy >= ax) return "pull";
  if (dy < -PULL_START_SLOP) return "not_a_pull";
  return "undecided";
}
