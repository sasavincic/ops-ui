// 1.5.0: moved whole from workforce-ops origin/main (96b4c7a) src/lib/pointer-intent.ts (identical in fina-ops origin/main).

/**
 * Did the pointer really move? Browsers report the pointer "entering" an
 * element that slides under a STILL cursor (a list opening or scrolling
 * beneath it), which made the ⌘K palette jump its selection to whatever row
 * happened to sit under the mouse (Saša, 2026-09-29). A hover may only move
 * a selection when the pointer itself moved since the last event.
 */
export type PointerSpot = { x: number; y: number };

export function pointerMoved(last: PointerSpot | null, now: PointerSpot): boolean {
  return last !== null && (last.x !== now.x || last.y !== now.y);
}
