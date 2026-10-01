"use client";

// The page frame of every suite app (1.5.0, styling programme §4.2): the Sidebar from lg, the
// MobileTopBar and its NavDrawer below, the main column with pull-to-search and the content
// column, the command palette and the NavTrail. Extracted from Workforce Ops' and FinaOps'
// (app)/layout.tsx, which rendered exactly this around their pages; with an app's nav, words
// and mark it renders the DOM that app rendered (tests/shell-markup.test.tsx).
//
// What stays app code: the session and the user, the read-permission filter (the nav arrays
// arrive filtered), the dictionary (strings.shell through OpsUiProvider), the search index and
// its ranking, the sign-out call, the brand mark, and anything the app mounts beside the page
// (Workforce Ops' assistant launcher: `afterMain`). The app renders AppFrame from a client
// component of its own (the props carry functions), inside its providers.

import { Suspense } from "react";
import { NavTrail } from "../navigation/nav-trail";
import { CommandPalette, type CommandPaletteProps, type PaletteLink } from "./command-palette";
import { MobileTopBar } from "./mobile-top-bar";
import { PullToSearch } from "./pull-to-search";
import { Sidebar, type ShellChromeProps } from "./sidebar";

/** The content column's reading width; a page with a [data-page-full-width] marker escapes it. */
export type ContentWidth = "5xl" | "6xl";

const CONTENT_WIDTH: Record<ContentWidth, string> = {
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
};

export type AppFrameProps<I> = ShellChromeProps & {
  /** From the request's User-Agent (isApplePlatform), for the sidebar's chord hints. */
  initialIsMac?: boolean;
  /**
   * The global search. `navigate` defaults to the workspaces, records and footer of `nav`
   * (the tools are not offered, as in both apps). Absent: no palette.
   */
  palette?: Omit<CommandPaletteProps<I>, "navigate"> & { navigate?: readonly PaletteLink[] };
  /** Default "6xl" (FinaOps); Workforce Ops reads at "5xl". */
  contentWidth?: ContentWidth;
  /**
   * The app floats a launcher button over the bottom right on phones (Workforce Ops' assistant):
   * the content gets pb-24 below sm instead of pb-16, so the launcher never covers the last row.
   */
  floatingLauncher?: boolean;
  /** Mounted after the main column, before the palette (Workforce Ops' AssistantLauncher). */
  afterMain?: React.ReactNode;
  /** No NavTrail (an app that does not record its back trail); default on. */
  navTrail?: boolean;
  /** The drawer starts open (stories, tests). */
  defaultDrawerOpen?: boolean;
  children: React.ReactNode;
};

/** The default "Go to" shortcuts: workspaces, records, footer, in nav order. */
export function paletteNavigate(nav: ShellChromeProps["nav"]): PaletteLink[] {
  return [...nav.workspaces, ...nav.records, ...(nav.footer ?? [])].map((item) => ({ href: item.href, label: item.label }));
}

export function AppFrame<I>({
  initialIsMac = false,
  palette,
  contentWidth = "6xl",
  floatingLauncher = false,
  afterMain,
  navTrail = true,
  defaultDrawerOpen,
  children,
  ...chrome
}: AppFrameProps<I>) {
  const pb = floatingLauncher ? "pb-24" : "pb-16";
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <Sidebar {...chrome} initialIsMac={initialIsMac} />
      <MobileTopBar {...chrome} defaultDrawerOpen={defaultDrawerOpen} />
      <main className="relative min-w-0 flex-1">
        {/* Phones: dragging the page down from its top opens the search - the content carries
            [data-pull-content] so the gesture can move it, and the pill rides in the gap it opens. */}
        <PullToSearch />
        {/* Phones get a tighter rhythm (gap-4, py-5): a list page stacks header, actions,
            toolbar and summary before its first row. */}
        <div
          data-pull-content
          className={`mx-auto flex ${CONTENT_WIDTH[contentWidth]} flex-col gap-4 px-4 py-5 ${pb} sm:gap-6 sm:px-8 sm:py-8 has-[[data-page-full-width]]:max-w-none`}
        >
          {children}
        </div>
      </main>
      {afterMain}
      {palette && <CommandPalette {...palette} navigate={palette.navigate ?? paletteNavigate(chrome.nav)} />}
      {/* Records where the person came from, so back links can return there (useSearchParams
          needs the Suspense boundary). */}
      {navTrail && (
        <Suspense fallback={null}>
          <NavTrail />
        </Suspense>
      )}
    </div>
  );
}
