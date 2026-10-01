// The shell's navigation model (1.5.0, styling programme §4.2): what AppFrame, Sidebar,
// MobileTopBar and CommandPalette draw. React-free apart from the icon slot's type, and
// server-safe: an app may build its nav arrays on the server or the client.
//
// The library never decides what a session may open. The app passes arrays it has already
// filtered by its read permissions (Workforce Ops' useReadableNav, PrefabOps' roles): the
// pages are the guard, the nav only stops offering a page that would answer "No access".

import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import type { NavIconName } from "./nav-icon";

/**
 * The three registers, and each says what kind of thing the link opens: workspaces are the
 * daily boards (accent), records are the business itself (plain), tools serve the office
 * (teal, `--color-tool`). One colour per register, nothing else carrying meaning.
 */
export type NavRegister = "record" | "workspace" | "tool";

/** One nav entry: already labelled in the user's language and already permitted. */
export type ShellNavItem = {
  href: string;
  label: string;
  /**
   * A library glyph by name (NavIcon), or the app's own node (usually `<NavIcon>{paths}</NavIcon>`
   * so it gets the same 15px box and margin). Records draw none in both apps today.
   */
  icon?: NavIconName | Exclude<ReactNode, string | number | bigint>;
  /** Overrides the group's register (workspaces: workspace, records and footer: record, tools: tool). */
  register?: NavRegister;
};

/**
 * The app's navigation, in nav order. `tools` absent = no tools register at all (FinaOps);
 * present but empty = the heading still shows (what Workforce Ops draws today when no tool is
 * readable). The workspaces' order is also their ⌥-digit chord order.
 */
export type ShellNav = {
  workspaces: readonly ShellNavItem[];
  records: readonly ShellNavItem[];
  tools?: readonly ShellNavItem[];
  /** Pinned to the bottom of the sidebar and the drawer (Settings). */
  footer?: readonly ShellNavItem[];
};

/** Is `href` the current section? The apps' rule: the path starts with it. */
export type NavActiveMatch = (href: string, pathname: string) => boolean;

export const startsWithMatch: NavActiveMatch = (href, pathname) => pathname.startsWith(href);

const REGISTER_ACTIVE: Record<NavRegister, string> = {
  record: "bg-sidebar-active font-medium text-sidebar-fg-active",
  workspace: "bg-accent/15 font-medium text-accent",
  tool: "bg-tool/15 font-medium text-tool",
};

// All three registers rest in the same neutral grey and only take their colour on hover and
// when active (Workforce Ops, 2026-08-28: tools coloured at rest read as permanently selected).
// The register still shows - in WHICH colour arrives on hover, and in the group heading and
// icon - without a link claiming the eye while the person is somewhere else.
const REGISTER_IDLE: Record<NavRegister, string> = {
  record: "text-sidebar-fg hover:bg-sidebar-hover hover:text-sidebar-fg-active",
  workspace: "text-sidebar-fg hover:bg-accent/10 hover:text-accent",
  tool: "text-sidebar-fg hover:bg-tool/10 hover:text-tool",
};

/** The classes of a sidebar / drawer link (both apps' navLinkClasses, word for word). */
export function navLinkClasses(active: boolean, register: NavRegister = "record") {
  return cn(
    // py-2.5 below lg: the drawer is a touch surface - 40px rows.
    "flex items-center rounded-control px-3 py-2.5 text-sm transition-colors duration-150 lg:py-2",
    active ? REGISTER_ACTIVE[register] : REGISTER_IDLE[register]
  );
}
