/**
 * What `pnpm shots` shoots, as data (spec §11.2), shared by gallery/playwright.config.ts, the shot
 * spec and tests/baselines.test.ts (which requires the baseline files to be exactly this matrix,
 * so a missing or orphaned baseline is red). No Playwright import: the unit tests read it too.
 */

/**
 * The projects: a desktop window, a narrow desktop window and a phone. The phone has touch and a
 * coarse pointer, so every `pointer-coarse:` class, `@media (pointer: coarse)` rule and
 * `(hover: none)` branch paints: PageHelp's 44px target, MonthNav's taller trigger, Segmented's
 * padding, app-feel.css, DateInput's calendar-instead-of-keyboard (a behaviour test reads its
 * inputmode). A plain narrow window reports a fine pointer that can hover, so without this project
 * no baseline would ever show a coarse rule. Each name is a folder of baselines:
 * gallery/__screenshots__/<project>/<brand>/.
 */
export const SHOT_PROJECTS = [
  { name: "1440", use: { viewport: { width: 1440, height: 900 } } },
  { name: "375", use: { viewport: { width: 375, height: 812 } } },
  { name: "375-touch", use: { viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 } },
] as const;

export type ShotProject = (typeof SHOT_PROJECTS)[number]["name"];

/**
 * An interaction state a story cannot show at rest: one control hovered, or focused as by the
 * keyboard, on an existing story. Shot in every brand at `STATE_PROJECT`, compared exactly like
 * the stories, so a change to a `hover:` or `focus-visible:` class these controls carry changes
 * a baseline (spec §4.1: it is then a major, or a regression). The list covers the controls whose
 * doctrine depends on the state: every Button variant (ghostDanger "reads like ghost until
 * hovered, then warns") and the admin icon button. Interaction styles of other controls are
 * outside the mechanical check and reviewed by hand (spec §4.1).
 */
export type StateShot = {
  /** The story id (`button--matrix`) the control sits in. */
  story: string;
  /** hover: the mouse over the target; focus-visible: the target focused as by the keyboard. */
  state: "hover" | "focus-visible";
  /** Names the control in the file name: `<story>@<state>-<label>.png`. */
  label: string;
  /** A Playwright selector matching exactly one element in the story. */
  target: string;
};

/** The project the state shots run in: states are shown on a fine pointer that can hover. */
export const STATE_PROJECT: ShotProject = "1440";

const BUTTON_VARIANTS = ["primary", "secondary", "ghost", "ghostDanger", "admin", "danger"] as const;

export const STATE_SHOTS: readonly StateShot[] = [
  ...BUTTON_VARIANTS.flatMap((variant) =>
    (["hover", "focus-visible"] as const).map((state) => ({
      story: "button--matrix",
      state,
      label: variant.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
      target: `section:has(> p:text-is("${variant}")) button:text-is("No icon")`,
    })),
  ),
  ...(["hover", "focus-visible"] as const).map((state) => ({
    story: "button--matrix",
    state,
    label: "admin-icon",
    target: 'button[aria-label="Admin edit"]',
  })),
];

/** The shot's name, and its baseline's file name without `.png`: `button--matrix@hover-ghost-danger`. */
export function stateShotName(shot: StateShot): string {
  return `${shot.story}@${shot.state}-${shot.label}`;
}
