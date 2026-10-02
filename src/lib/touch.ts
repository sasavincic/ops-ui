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

/**
 * The 48px floor of the lg surface (1.8.0; PrefabOps restyle plan §10.2, P4.8): the workshop
 * portal's controls are 48px at every width, so the kit's own small targets inside an lg control
 * (DateInput's / YearInput's field button) reach 48 under the touch floor instead of 44.
 */
export const TOUCH_FLOOR_LG = {
  height: "[@media(hover:none)_and_(pointer:coarse)]:in-data-ops-touch:min-h-12",
  width: "[@media(hover:none)_and_(pointer:coarse)]:in-data-ops-touch:min-w-12",
} as const;

/**
 * An invisible target (1.8.0): under the touch floor the control gets a centred `::after` at least
 * 44 x 44 (and never smaller than the control), so a small inline control (the bare Checkbox's box,
 * CopyValue, TagRemove) is easy to hit without growing the line it sits in. The pseudo-element is
 * part of the element, so a tap on it is a tap on the control. Nothing paints, at any pointer.
 */
export const TOUCH_TARGET = [
  "[@media(hover:none)_and_(pointer:coarse)]:in-data-ops-touch:relative",
  "[@media(hover:none)_and_(pointer:coarse)]:in-data-ops-touch:after:absolute",
  "[@media(hover:none)_and_(pointer:coarse)]:in-data-ops-touch:after:top-1/2",
  "[@media(hover:none)_and_(pointer:coarse)]:in-data-ops-touch:after:left-1/2",
  "[@media(hover:none)_and_(pointer:coarse)]:in-data-ops-touch:after:size-full",
  "[@media(hover:none)_and_(pointer:coarse)]:in-data-ops-touch:after:min-h-11",
  "[@media(hover:none)_and_(pointer:coarse)]:in-data-ops-touch:after:min-w-11",
  "[@media(hover:none)_and_(pointer:coarse)]:in-data-ops-touch:after:-translate-1/2",
] as const;
