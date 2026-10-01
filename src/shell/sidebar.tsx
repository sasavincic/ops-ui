"use client";

// The desktop navigation column (1.5.0; Workforce Ops' and FinaOps' shell/sidebar.tsx, which
// were the same file apart from their nav arrays and their mark): the app's mark (as the suite's
// app switcher), the Search button, the three registers and the footer, the account block.
// Hidden below lg, where MobileTopBar + NavDrawer take over.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AppSwitcher } from "../components/app-switcher";
import { SearchIcon } from "../components/search-input";
import { useOpsUi } from "../config/provider";
import { EN_OPTIONAL_STRINGS } from "../config/strings";
import type { OpsApp, OpsAppId } from "../lib/apps";
import {
  chordLabel,
  isApplePlatform,
  isChordModifierKey,
  searchChordKeys,
  workspaceShortcutIndex,
} from "../lib/keyboard";
import { openCommandPalette } from "./command-palette";
import { NAV_ICON_NAMES, NavIcon, type NavIconName } from "./nav-icon";
import { navLinkClasses, startsWithMatch, type NavActiveMatch, type NavRegister, type ShellNav, type ShellNavItem } from "./nav";
import { SignOutButton } from "./sign-out-button";

/** The signed-in person, shown under the nav with Sign out. */
export type ShellUser = { name: string; email: string };

/** What Sidebar, MobileTopBar and NavDrawer share. */
export type ShellChromeProps = {
  /** The app's mark and wordmark (its BrandMark), drawn on the sidebar colour. */
  mark: React.ReactNode;
  /** The app the mark belongs to: the mark becomes the suite's AppSwitcher. Absent: the mark alone. */
  app?: OpsAppId;
  /** The switcher's list; default OPS_APPS (stories and tests pass their own). */
  apps?: readonly OpsApp[];
  nav: ShellNav;
  /** No user = no account block (a story, a kiosk). */
  user?: ShellUser;
  /** The app's sign-out (its auth client, then its sign-in page). Required with `user`. */
  onSignOut?: () => void | Promise<void>;
  /** Which link is the current section; default: the path starts with its href. */
  isActive?: NavActiveMatch;
};

/** The mark as the app switcher's trigger (or alone, without an app id). */
export function ShellMark({ mark, app, apps }: Pick<ShellChromeProps, "mark" | "app" | "apps">) {
  return app ? <AppSwitcher current={app} mark={mark} apps={apps} /> : <>{mark}</>;
}

/** An item's glyph: a library name, or the app's own node. */
export function NavItemIcon({ icon }: { icon: ShellNavItem["icon"] }) {
  if (icon === undefined || icon === null || icon === false || icon === true) return null;
  return isNavIconName(icon) ? <NavIcon name={icon} /> : <>{icon}</>;
}

function isNavIconName(icon: unknown): icon is NavIconName {
  return typeof icon === "string" && (NAV_ICON_NAMES as readonly string[]).includes(icon);
}

/** A group heading (Records, Tools): the shell's quiet uppercase label. */
export function NavGroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 px-3 text-micro font-medium uppercase tracking-wider text-sidebar-fg/70">{children}</p>
  );
}

/** The hairline between two registers. */
export function NavDivider() {
  return <div aria-hidden className="mx-3 my-2 border-t border-sidebar-border" />;
}

/** The register an item paints in: its own, else its group's. */
export function itemRegister(item: ShellNavItem, group: NavRegister): NavRegister {
  return item.register ?? group;
}

/**
 * Workspace chords: ⌥ / Alt + 1…N opens the Nth workspace (on a Mac the browser keeps ⌘1-9 for
 * its tabs and never delivers them, so ⌥ is the only chord), and while ⌥ is HELD the workspace
 * icons turn into their numbers - the hint lives exactly where the answer is, and nothing shows
 * until it is asked for. ⌘K stays the search. Returns whether the modifier is held and how the
 * chords are written here.
 */
const subscribeNever = () => () => {};
const readIsMac = () => isApplePlatform(navigator.platform);

export function useWorkspaceChords(
  initialIsMac: boolean,
  workspaces: readonly { href: string }[]
): { held: boolean; isMac: boolean } {
  const router = useRouter();
  const [held, setHeld] = useState(false);
  // The request's User-Agent supplies both SSR and hydration: a Mac sees ⌘K from the first
  // paint, before the browser snapshot is available.
  const isMac = useSyncExternalStore(subscribeNever, readIsMac, () => initialIsMac);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isChordModifierKey(e.key)) setHeld(true);
      const index = workspaceShortcutIndex(e, workspaces.length);
      if (index === null) return;
      e.preventDefault();
      router.push(workspaces[index].href);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (isChordModifierKey(e.key)) setHeld(false);
    };
    // ⌘-Tab away and the keyup never arrives: the window losing focus is the reliable "let go".
    const release = () => setHeld(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", release);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", release);
    };
  }, [router, workspaces]);
  return { held, isMac };
}

/** The digit that stands in for a workspace icon while ⌥ is held. */
function ChordNumber({ n }: { n: number }) {
  return (
    <span
      aria-hidden
      className="mr-2 inline-flex size-[15px] shrink-0 items-center justify-center rounded-sm border border-current text-micro font-semibold leading-none"
    >
      {n}
    </span>
  );
}

/** Desktop navigation column: hidden below lg, where MobileTopBar takes over. */
export function Sidebar({
  mark,
  app,
  apps,
  nav,
  user,
  onSignOut,
  isActive = startsWithMatch,
  initialIsMac = false,
}: ShellChromeProps & {
  /** From the request's User-Agent (isApplePlatform), so the chord hints render right on the server. */
  initialIsMac?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const { strings } = useOpsUi();
  const words = strings.shell ?? EN_OPTIONAL_STRINGS.shell;
  const { held: chordHeld, isMac } = useWorkspaceChords(initialIsMac, nav.workspaces);
  const link = (item: ShellNavItem, group: NavRegister, icon: React.ReactNode) => (
    <Link
      key={item.href}
      href={item.href}
      className={navLinkClasses(isActive(item.href, pathname), itemRegister(item, group))}
    >
      {icon}
      {item.label}
    </Link>
  );

  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col bg-sidebar lg:flex">
      <div className="flex items-center px-5 pt-5 pb-6">
        <ShellMark mark={mark} app={app} apps={apps} />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {/* Spotlight entry: "on top of the workspaces" without a route. */}
        <button
          type="button"
          onClick={openCommandPalette}
          className="mb-1 flex items-center justify-between rounded-control border border-sidebar-border px-3 py-2 text-sm text-sidebar-fg transition-colors duration-150 hover:bg-sidebar-hover hover:text-sidebar-fg-active"
        >
          <span className="flex items-center gap-2">
            <SearchIcon />
            {words.search}
          </span>
          {/* One chip per key, like the `/` hint on page searches: "⌘K" as one run of glyphs read
              as a single symbol, and a Windows keyboard has no ⌘ at all. */}
          <kbd aria-hidden className="flex items-center gap-1 font-sans text-micro text-sidebar-fg/70">
            {searchChordKeys(isMac).map((key) => (
              <span
                key={key}
                className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-sm border border-sidebar-border px-1 leading-none"
              >
                {key}
              </span>
            ))}
          </kbd>
        </button>
        {nav.workspaces.map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            className={navLinkClasses(isActive(item.href, pathname), itemRegister(item, "workspace"))}
            title={chordLabel(i + 1, isMac)}
          >
            {chordHeld ? <ChordNumber n={i + 1} /> : <NavItemIcon icon={item.icon} />}
            {item.label}
          </Link>
        ))}

        <NavDivider />

        <NavGroupHeading>{words.records}</NavGroupHeading>
        {nav.records.map((item) => link(item, "record", <NavItemIcon icon={item.icon} />))}

        {nav.tools && (
          <>
            <NavDivider />

            <NavGroupHeading>{words.tools}</NavGroupHeading>
            {nav.tools.map((item) => link(item, "tool", <NavItemIcon icon={item.icon} />))}
          </>
        )}

        <div className="mt-auto mb-2 flex flex-col gap-0.5">
          {(nav.footer ?? []).map((item) => link(item, "record", <NavItemIcon icon={item.icon} />))}
        </div>
      </nav>

      {user && (
        <div className="border-t border-sidebar-border px-5 py-4">
          <p className="truncate text-detail font-medium text-sidebar-fg-active">{user.name}</p>
          <p className="truncate text-xs text-sidebar-fg">{user.email}</p>
          {onSignOut && <SignOutButton onSignOut={onSignOut} className="mt-2" />}
        </div>
      )}
    </aside>
  );
}
