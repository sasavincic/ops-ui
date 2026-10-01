/**
 * The opt-in touch floor (1.3.0; PrefabOps restyle plan G2, §7.1). An app turns it on by putting
 * `data-ops-touch` on an ancestor (PrefabOps: `<html data-ops-touch>`); then, on a screen that
 * cannot hover and has a coarse pointer, every kit control is at least 44px tall (icon-only
 * controls 44px wide too) and every text input draws 16px text (iOS zooms into anything smaller).
 * Without the attribute nothing changes, so Workforce Ops and FinaOps render exactly as before.
 *
 * Written out as whole class names so Tailwind, which scans the vendored source, generates them:
 * an arbitrary media variant (the exact `(hover: none) and (pointer: coarse)` query; the
 * built-in `pointer-coarse:` alone would also catch a touch laptop that hovers) and `in-data-*`,
 * which matches when an ANCESTOR carries the attribute.
 */
export const TOUCH_FLOOR = {
  /** Controls: at least 44px tall. */
  height: "[@media(hover:none)_and_(pointer:coarse)]:in-data-ops-touch:min-h-11",
  /** Icon-only controls: at least 44px wide as well. */
  width: "[@media(hover:none)_and_(pointer:coarse)]:in-data-ops-touch:min-w-11",
  /** Text inputs: 16px text. */
  text: "[@media(hover:none)_and_(pointer:coarse)]:in-data-ops-touch:text-base",
} as const;

/** The two control sizes of the input family (Input, Select, Combobox, DateInput). */
export type ControlSize = "md" | "lg";

/**
 * The height and text classes of each input-family size: md is today's h-9 (16px text below lg,
 * 14px from lg, from controlClasses); lg is 48px with 16px text at every width.
 */
export const CONTROL_SIZE_CLASS: Record<ControlSize, string> = {
  md: "h-9",
  lg: "h-12 lg:text-base",
};
