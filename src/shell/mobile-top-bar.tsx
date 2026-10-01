"use client";

// The phone shell (1.5.0; Workforce Ops' and FinaOps' shell/mobile-top-bar.tsx): a sticky top
// bar with the mark, the search magnifier and the menu button, and the slide-out NavDrawer with
// the same registers as the sidebar. Hidden from lg.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SearchIcon } from "../components/search-input";
import { useOpsUi } from "../config/provider";
import { EN_OPTIONAL_STRINGS } from "../config/strings";
import { openCommandPalette } from "./command-palette";
import { navLinkClasses, startsWithMatch, type NavRegister, type ShellNavItem } from "./nav";
import {
  NavDivider,
  NavGroupHeading,
  NavItemIcon,
  ShellMark,
  itemRegister,
  type ShellChromeProps,
} from "./sidebar";
import { SignOutButton } from "./sign-out-button";

/** Phone shell: sticky top bar + slide-out navigation drawer. Hidden from lg. */
export function MobileTopBar({
  defaultDrawerOpen = false,
  ...chrome
}: ShellChromeProps & {
  /** The drawer starts open (stories, tests); default closed. */
  defaultDrawerOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultDrawerOpen);
  const pathname = usePathname() ?? "";
  const { strings } = useOpsUi();
  const words = strings.shell ?? EN_OPTIONAL_STRINGS.shell;

  // Close the drawer whenever navigation happens (derived during render).
  const [shownPath, setShownPath] = useState(pathname);
  if (pathname !== shownPath) {
    setShownPath(pathname);
    if (open) setOpen(false);
  }

  // Keep the page from scrolling behind the open drawer.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* pt env() keeps the bar clear of the notch / status bar once the app runs standalone
          (viewportFit: "cover"); an app's sticky offsets mirror this height. */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:hidden">
        <ShellMark mark={chrome.mark} app={chrome.app} apps={chrome.apps} />
        <span className="flex items-center gap-1">
          <button
            aria-label={words.search}
            onClick={openCommandPalette}
            className="rounded-control p-2.5 text-sidebar-fg-active transition-colors duration-150 hover:bg-sidebar-hover"
          >
            <SearchIcon size={18} />
          </button>
          <button
            aria-label={open ? words.closeMenu : words.openMenu}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="rounded-control p-2.5 text-sidebar-fg-active transition-colors duration-150 hover:bg-sidebar-hover"
          >
            <svg
              aria-hidden
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            >
              {open ? (
                <>
                  <path d="M5 5l10 10" />
                  <path d="M15 5L5 15" />
                </>
              ) : (
                <>
                  <path d="M3 5.5h14" />
                  <path d="M3 10h14" />
                  <path d="M3 14.5h14" />
                </>
              )}
            </svg>
          </button>
        </span>
      </header>

      {open && <NavDrawer {...chrome} pathname={pathname} onClose={() => setOpen(false)} />}
    </>
  );
}

/**
 * The open drawer: a backdrop and the nav column sliding in from the left (z-40: above content
 * stickies and sheets, below the palette's 60). Its links scroll on short phones; the account
 * block stays pinned below so Sign out is always reachable.
 */
export function NavDrawer({
  nav,
  user,
  onSignOut,
  isActive = startsWithMatch,
  pathname,
  onClose,
}: Pick<ShellChromeProps, "nav" | "user" | "onSignOut" | "isActive"> & {
  pathname: string;
  onClose: () => void;
}) {
  const { strings } = useOpsUi();
  const words = strings.shell ?? EN_OPTIONAL_STRINGS.shell;
  const link = (item: ShellNavItem, group: NavRegister) => (
    <Link
      key={item.href}
      href={item.href}
      className={navLinkClasses(isActive(item.href, pathname), itemRegister(item, group))}
    >
      <NavItemIcon icon={item.icon} />
      {item.label}
    </Link>
  );
  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <button aria-label={words.closeMenu} className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <nav className="absolute inset-y-0 left-0 flex w-64 flex-col bg-sidebar pt-[calc(4rem+env(safe-area-inset-top))] shadow-xl">
        <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain px-3 pb-2">
          {nav.workspaces.map((item) => link(item, "workspace"))}

          <NavDivider />

          <NavGroupHeading>{words.records}</NavGroupHeading>
          {nav.records.map((item) => link(item, "record"))}

          {nav.tools && (
            <>
              <NavDivider />

              <NavGroupHeading>{words.tools}</NavGroupHeading>
              {nav.tools.map((item) => link(item, "tool"))}
            </>
          )}

          <div className="mt-auto mb-2 flex flex-col gap-0.5">{(nav.footer ?? []).map((item) => link(item, "record"))}</div>
        </div>
        {user && (
          // pb env() lifts Sign out clear of the iOS home indicator.
          <div className="border-t border-sidebar-border px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <p className="truncate text-detail font-medium text-sidebar-fg-active">{user.name}</p>
            <p className="truncate text-xs text-sidebar-fg">{user.email}</p>
            {onSignOut && <SignOutButton onSignOut={onSignOut} className="mt-2 inline-flex min-h-10 items-center" />}
          </div>
        )}
      </nav>
    </div>
  );
}
