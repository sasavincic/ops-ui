// The nav glyphs (1.5.0): simple 16-unit line glyphs, one per workspace and tool, drawn in a
// 15px box with the link's text colour. The set is the union of Workforce Ops' and FinaOps'
// sidebar glyphs, named by what they draw (an app maps its sections onto them); an app glyph
// the set lacks is the app's own paths inside <NavIcon>, which gives them the same box.
// Server-safe: no hooks, no handlers.

import type { ReactNode } from "react";

/**
 * Glyph names, with the section each one draws today: board (WFO Work Operations),
 * shield-check (WFO HR & Compliance), receipt (WFO Hours & Invoicing), paper-plane (WFO Client
 * Operations), truck (WFO Logistics), person-plus (WFO Recruiting & Pay), document (WFO Document
 * Builder), tray-check (FinaOps Review), invoice (FinaOps Invoicing), calendar-check (FinaOps
 * Month-end), report (FinaOps Reports), bars (FinaOps Analysis), bulb (FinaOps Insights).
 */
export const NAV_ICON_NAMES = [
  "board",
  "shield-check",
  "receipt",
  "paper-plane",
  "truck",
  "person-plus",
  "document",
  "tray-check",
  "invoice",
  "calendar-check",
  "report",
  "bars",
  "bulb",
] as const;

export type NavIconName = (typeof NAV_ICON_NAMES)[number];

function Glyph({ name }: { name: NavIconName }) {
  switch (name) {
    case "board":
      return (
        <>
          <rect x="1.5" y="2" width="13" height="12" rx="1.5" />
          <path d="M1.5 6h13" />
          <path d="M6.5 6v8" />
        </>
      );
    case "shield-check":
      return (
        <>
          <path d="M8 1.5l5.5 2v4c0 3.2-2.2 5.6-5.5 7-3.3-1.4-5.5-3.8-5.5-7v-4l5.5-2z" />
          <path d="M5.5 8l1.8 1.8L10.5 6.5" />
        </>
      );
    case "receipt":
      return (
        <>
          <path d="M3 1.5h10v13l-2-1.2-2 1.2-1-.6-1 .6-2-1.2-2 1.2v-13z" />
          <path d="M5.5 5h5" />
          <path d="M5.5 8h5" />
        </>
      );
    case "paper-plane":
      return (
        <>
          <path d="M14.5 1.5L1.5 6.8l4.4 1.9 6-4.7-4.4 5.3.6 4.2 2.1-3 3.3 1.4 1-10.4z" />
        </>
      );
    case "truck":
      return (
        <>
          <path d="M1.5 4.5h8v7h-8z" />
          <path d="M9.5 7h3l2 2.5v2h-5" />
          <circle cx="4.5" cy="12.5" r="1.3" />
          <circle cx="11.5" cy="12.5" r="1.3" />
        </>
      );
    case "person-plus":
      // A person with a plus - someone joining.
      return (
        <>
          <circle cx="6" cy="5" r="2.6" />
          <path d="M1.5 14c0-2.6 2-4.5 4.5-4.5s4.5 1.9 4.5 4.5" />
          <path d="M12.5 5.5v4M10.5 7.5h4" />
        </>
      );
    case "document":
      // A sheet with a folded corner and a written line or two.
      return (
        <>
          <path d="M3 1.5h6l4 4v9H3v-13z" />
          <path d="M9 1.5v4h4" />
          <path d="M5.5 9h5" />
          <path d="M5.5 11.5h3" />
        </>
      );
    case "tray-check":
      // A tray with a tick - lines waiting for a decision.
      return (
        <>
          <path d="M1.5 9.5 3.5 3h9l2 6.5v4h-13z" />
          <path d="M1.5 9.5h4l1 1.5h3l1-1.5h4" />
          <path d="m6 6 1.5 1.5L10.5 4.5" />
        </>
      );
    case "invoice":
      // A receipt with three lines - what was billed, until the bank line pays it.
      return (
        <>
          <path d="M3.5 1.5h9v13l-1.5-1-1.5 1-1.5-1-1.5 1-1.5-1-1.5 1z" />
          <path d="M6 5h4M6 7.5h4M6 10h2.5" />
        </>
      );
    case "calendar-check":
      // A month sheet with a tick - the month signed off.
      return (
        <>
          <path d="M2.5 3h11v11h-11z" />
          <path d="M2.5 6h11M5.5 1.5V4M10.5 1.5V4" />
          <path d="m6 10 1.5 1.5 3-3" />
        </>
      );
    case "report":
      // A sheet with a result line under the figures.
      return (
        <>
          <path d="M3 1.5h10v13H3z" />
          <path d="M5.5 5h5M5.5 7.5h5" />
          <path d="M5.5 11h5" strokeWidth="2" />
        </>
      );
    case "bars":
      return (
        <>
          <path d="M2 14h12" />
          <path d="M4 11V7M7 11V4M10 11V8M13 11V5.5" />
        </>
      );
    case "bulb":
      // A light bulb - something to act on.
      return (
        <>
          <path d="M6 12.5h4M6.5 14.5h3" />
          <path d="M8 1.5a4.5 4.5 0 0 0-2.5 8.2V11h5V9.7A4.5 4.5 0 0 0 8 1.5z" />
        </>
      );
  }
}

/**
 * A nav glyph: `name` draws one of the library's, `children` draws the app's own paths in the
 * same box (15px, 16-unit view box, 1.5 stroke in the text colour, 8px right margin).
 */
export function NavIcon({ name, children }: { name?: NavIconName; children?: ReactNode }) {
  return (
    <svg
      aria-hidden
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mr-2 shrink-0"
    >
      {name ? <Glyph name={name} /> : children}
    </svg>
  );
}
