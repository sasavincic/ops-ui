"use client";

// The global search palette (1.5.0, styling programme §4.2; Workforce Ops' and FinaOps'
// shell/command-palette.tsx): Spotlight for the app - ⌘K / Ctrl-K anywhere, the Search button
// atop the sidebar, the magnifier in the phone top bar, a pull from the top of a phone page, or
// `/` and ⌘⇧F when the page has no search field of its own (lib/keyboard.ts). One read of the
// app's search index per open (cached 60 s), every keystroke filtered locally by the app's own
// ranking. Navigate and create shortcuts while nothing is typed; an optional last row hands the
// query on (Workforce Ops: "Ask the assistant", FinaOps: "Search transactions").
//
// The library owns the overlay, the keyboard, the selection rule (a row is selected by a pointer
// that MOVED over it, never by a list that opened or scrolled under a resting cursor), the
// full-screen phone sheet and its visual-viewport sizing. The app owns what is searched, how it
// ranks and what it is called.
//
// Deliberately NOT the Dialog kit: its no-Escape / no-backdrop doctrine protects half-filled
// forms; a palette is ephemeral navigation, where Escape and a backdrop press close it.

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SearchIcon } from "../components/search-input";
import { StateMark } from "../components/state-mark";
import { useOpsUi } from "../config/provider";
import { EN_OPTIONAL_STRINGS } from "../config/strings";
import { focusPageSearch, isPageSearchShortcut } from "../lib/keyboard";
import { pointerMoved, type PointerSpot } from "../lib/pointer-intent";
import { normalizeSearchText } from "../lib/text";
import type { StateMarkSpec } from "../types";

/** The window event that opens the palette (openCommandPalette dispatches it). */
export const OPEN_SEARCH_EVENT = "ops-ui:open-search";

/** Opens the palette from anywhere (a button, a gesture, an app shortcut). */
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
}

/** One search result: a record the app found for the query. */
export type PaletteEntry = {
  /** Unique within its section (React key; never rendered). */
  key: string;
  href: string;
  title: string;
  subtitle?: string | null;
  /** The outlined state mark of an exception (status doctrine): only when the row needs one. */
  status?: (StateMarkSpec & { label: string }) | null;
};

/** One group of results under its header (the app's kind label). */
export type PaletteSection = { header: string; entries: readonly PaletteEntry[] };

/** A shortcut row: a page to go to, or a "New …" form to open. */
export type PaletteLink = { href: string; label: string };

/**
 * The optional last row once something is typed: hands the query to something that searches
 * more than the palette's index. `href` navigates there; `onSelect` does anything else (an
 * event for an assistant). The palette closes first either way.
 */
export type PaletteTrailing = {
  header: string;
  /** The row's words for this query ("Ask the assistant: “{query}”"). */
  label: (query: string) => string;
  /** A 14px glyph (ChatGlyph, ListGlyph or the app's own). */
  icon: React.ReactNode;
  href?: (query: string) => string;
  onSelect?: (query: string) => void;
};

export type CommandPaletteProps<I> = {
  /** Reads the app's search index; a stable function (a server action), called once per open. */
  loadIndex: () => Promise<I>;
  /** The app's ranking: the result sections for a typed query (never called with an empty one). */
  search: (query: string, index: I) => readonly PaletteSection[];
  /** "Go to" shortcuts, already filtered by what the session may open. */
  navigate: readonly PaletteLink[];
  /** "Create new" shortcuts, already filtered by what the session may create. */
  create?: readonly PaletteLink[];
  trailing?: PaletteTrailing;
  /** Opens on mount (stories, a deep link); default closed. */
  defaultOpen?: boolean;
  /** The query an initially open palette starts with. */
  defaultQuery?: string;
};

// Module-level cache: rapid re-opens do not refetch; staleness is bounded by the palette open
// (navigation freshness, not display data). Keyed by the loader, so two palettes never share.
let indexCache: { at: number; loader: unknown; entries: unknown } | null = null;
const INDEX_TTL_MS = 60_000;

function cachedIndex<I>(loader: () => Promise<I>): I | null {
  const cached = indexCache;
  return cached && cached.loader === loader && Date.now() - cached.at < INDEX_TTL_MS ? (cached.entries as I) : null;
}

type Row =
  | { type: "entry"; entry: PaletteEntry }
  | { type: "link"; href: string; label: string; group: "navigate" | "create" }
  | { type: "trailing"; query: string };

export function CommandPalette<I>({
  loadIndex,
  search,
  navigate,
  create = [],
  trailing,
  defaultOpen = false,
  defaultQuery = "",
}: CommandPaletteProps<I>) {
  const { strings } = useOpsUi();
  const words = strings.shell ?? EN_OPTIONAL_STRINGS.shell;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState(defaultOpen ? defaultQuery : "");
  const [index, setIndex] = useState<I | null>(() => (defaultOpen ? cachedIndex(loadIndex) : null));
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // The mouse selects a row only when it MOVES over it - never because the list appeared or
  // scrolled under a resting cursor (lib/pointer-intent).
  const lastPointer = useRef<PointerSpot | null>(null);
  const hoverRow = (i: number) => (e: React.PointerEvent) => {
    const now = { x: e.clientX, y: e.clientY };
    const moved = pointerMoved(lastPointer.current, now);
    lastPointer.current = now;
    if (moved) setActive(i);
  };

  const loaderRef = useRef(loadIndex);
  useEffect(() => {
    loaderRef.current = loadIndex;
  }, [loadIndex]);
  const fetchIndex = useCallback(() => {
    const loader = loaderRef.current;
    loader().then((entries) => {
      indexCache = { at: Date.now(), loader, entries };
      setIndex(entries);
    });
  }, []);

  // Opening resets the palette and loads the index (cached for 60 s) - done in the opener, not
  // in an effect, so a render never cascades.
  const openRef = useRef(defaultOpen);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  const openPalette = useCallback(() => {
    setQuery("");
    setActive(0);
    lastPointer.current = null;
    const cached = cachedIndex(loaderRef.current);
    if (cached !== null) {
      setIndex(cached);
    } else {
      setIndex(null);
      fetchIndex();
    }
    setOpen(true);
  }, [fetchIndex]);

  // An initially open palette loads its index once mounted.
  const initiallyOpen = useRef(defaultOpen);
  useEffect(() => {
    if (initiallyOpen.current && cachedIndex(loaderRef.current) === null) fetchIndex();
  }, [fetchIndex]);

  // Summons: ⌘K / Ctrl-K and openCommandPalette(). `/` and ⌘⇧F go to the PAGE's search first
  // and land here only when the page has none (lib/keyboard.ts).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (openRef.current) setOpen(false);
        else openPalette();
        return;
      }
      if (isPageSearchShortcut(e)) {
        e.preventDefault();
        if (!focusPageSearch()) openPalette();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, openPalette);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, openPalette);
    };
  }, [openPalette]);

  useEffect(() => {
    if (!open) return;
    const focus = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(focus);
  }, [open]);

  // Navigation closes the palette (a row press or an outside route change) - derived during
  // render from the path it was opened on.
  const [shownPath, setShownPath] = useState(pathname);
  if (pathname !== shownPath) {
    setShownPath(pathname);
    if (open) setOpen(false);
  }

  const shortcuts = useMemo(
    () => ({
      navigate: navigate.map((link): Row => ({ type: "link", href: link.href, label: link.label, group: "navigate" })),
      create: create.map((link): Row => ({ type: "link", href: link.href, label: link.label, group: "create" })),
    }),
    [navigate, create]
  );

  // The visible rows: shortcuts while idle; the app's ranked results + matching shortcuts + the
  // trailing row once something is typed.
  const sections = useMemo((): { header: string; rows: Row[] }[] => {
    const q = normalizeSearchText(query);
    if (q === "") {
      return [
        { header: words.searchNavigate, rows: shortcuts.navigate },
        { header: words.searchCreate, rows: shortcuts.create },
      ];
    }
    const out: { header: string; rows: Row[] }[] = [];
    // Until the index arrives there is nothing to rank (the "…" line says so).
    for (const section of index === null ? [] : search(query, index)) {
      out.push({ header: section.header, rows: section.entries.map((entry) => ({ type: "entry", entry })) });
    }
    const matchLink = (row: Row) => row.type === "link" && normalizeSearchText(row.label).includes(q);
    const nav = shortcuts.navigate.filter(matchLink);
    const make = shortcuts.create.filter(matchLink);
    if (nav.length > 0) out.push({ header: words.searchNavigate, rows: nav });
    if (make.length > 0) out.push({ header: words.searchCreate, rows: make });
    if (trailing) out.push({ header: trailing.header, rows: [{ type: "trailing", query: query.trim() }] });
    return out;
  }, [query, index, shortcuts, search, trailing, words]);

  const flatRows = useMemo(() => sections.flatMap((s) => s.rows), [sections]);
  const clampedActive = Math.min(active, Math.max(0, flatRows.length - 1));
  const noResults = flatRows.every((row) => row.type === "trailing");

  function select(row: Row) {
    setOpen(false);
    if (row.type === "trailing") {
      if (trailing?.href) router.push(trailing.href(row.query));
      trailing?.onSelect?.(row.query);
      return;
    }
    router.push(row.type === "entry" ? row.entry.href : row.href);
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, flatRows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = flatRows[clampedActive];
      if (row) select(row);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  // Keep the active row in view while arrowing.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-row-index="${clampedActive}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [clampedActive]);

  // Phones: the sheet is full-screen and the input autofocuses, so the on-screen keyboard is up
  // for the whole interaction. iOS overlays the keyboard without resizing the layout viewport -
  // the sheet is sized from the visual viewport so the result list (and the always-last trailing
  // row) never hides behind the keys. Android is handled by the root viewport's
  // interactiveWidget: "resizes-content".
  const sheetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const vv = window.visualViewport;
    const size = () => {
      const sheet = sheetRef.current;
      if (!sheet || !vv) return;
      // Only the full-screen phone variant is height-managed.
      if (window.matchMedia("(min-width: 40rem)").matches) {
        sheet.style.height = "";
        return;
      }
      sheet.style.height = vv.height < window.innerHeight - 1 ? `${vv.height}px` : "";
    };
    size();
    vv?.addEventListener("resize", size);
    const sheetAtOpen = sheetRef.current;
    return () => {
      document.body.style.overflow = "";
      vv?.removeEventListener("resize", size);
      if (sheetAtOpen) sheetAtOpen.style.height = "";
    };
  }, [open]);

  if (!open) return null;

  let rowIndex = -1;
  return (
    <div className="fixed inset-0 z-[60]">
      <button aria-label={words.closeSearch} className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal
        aria-label={words.search}
        className="absolute inset-0 flex flex-col bg-bg sm:inset-x-0 sm:top-[10dvh] sm:bottom-auto sm:mx-auto sm:max-h-[70dvh] sm:w-[min(640px,calc(100%-2rem))] sm:rounded-container sm:border sm:border-border sm:shadow-xl"
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-3">
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder={words.searchPlaceholder}
            aria-label={words.search}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKeyDown}
            className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-muted lg:text-sm"
          />
          <kbd className="hidden rounded-control border border-border px-1.5 py-0.5 text-micro text-ink-muted sm:inline">
            Esc
          </kbd>
          <button
            type="button"
            aria-label={words.closeSearch}
            onClick={() => setOpen(false)}
            className="rounded-control p-2.5 text-ink-secondary hover:bg-surface hover:text-ink sm:hidden"
          >
            ✕
          </button>
        </div>

        <div
          ref={listRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        >
          {query.trim() !== "" && index === null && <p className="px-3 py-2 text-detail text-ink-muted">…</p>}
          {query.trim() !== "" && index !== null && noResults && (
            <p className="px-3 py-2 text-detail text-ink-muted">{words.searchNoResults}</p>
          )}
          {sections.map((section) => (
            <section key={section.header} className="mb-2">
              <h3 className="px-3 pb-1 pt-2 text-micro font-medium uppercase tracking-wide text-ink-muted">
                {section.header}
              </h3>
              {section.rows.map((row) => {
                rowIndex += 1;
                const i = rowIndex;
                const isActive = i === clampedActive;
                const rowClass = `flex w-full items-center justify-between gap-3 rounded-control px-3 py-2.5 text-left text-sm lg:py-2 ${
                  isActive ? "bg-primary-subtle text-ink" : "text-ink hover:bg-surface"
                }`;
                if (row.type === "trailing") {
                  return (
                    <button
                      key="trailing"
                      type="button"
                      data-row-index={i}
                      className={rowClass}
                      onPointerMove={hoverRow(i)}
                      onClick={() => select(row)}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {trailing?.icon}
                        <span className="truncate">{trailing?.label(row.query)}</span>
                      </span>
                    </button>
                  );
                }
                if (row.type === "link") {
                  return (
                    <button
                      key={`${row.group}:${row.href}`}
                      type="button"
                      data-row-index={i}
                      className={rowClass}
                      onPointerMove={hoverRow(i)}
                      onClick={() => select(row)}
                    >
                      <span className="truncate">{row.label}</span>
                    </button>
                  );
                }
                const { entry } = row;
                return (
                  <button
                    key={entry.key}
                    type="button"
                    data-row-index={i}
                    className={rowClass}
                    onPointerMove={hoverRow(i)}
                    onClick={() => select(row)}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{entry.title}</span>
                      {entry.subtitle && <span className="truncate text-detail text-ink-muted">{entry.subtitle}</span>}
                    </span>
                    {entry.status && (
                      // Results follow the row rule: outlined, and only for the exception
                      // (the status doctrine).
                      <StateMark icon={entry.status.icon} tone={entry.status.tone}>
                        {entry.status.label}
                      </StateMark>
                    )}
                  </button>
                );
              })}
            </section>
          ))}
          {query.trim() === "" && <p className="px-3 py-2 text-detail text-ink-muted">{words.searchEmptyHint}</p>}
        </div>
      </div>
    </div>
  );
}

/** Workforce Ops' trailing-row glyph: a speech bubble (hand the query to the assistant). */
export function ChatGlyph() {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-primary"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

/** FinaOps' trailing-row glyph: a list (hand the query to a list's database search). */
export function ListGlyph() {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="shrink-0 text-primary"
    >
      <path d="M5 4h9M5 8h9M5 12h9M2 4h.01M2 8h.01M2 12h.01" />
    </svg>
  );
}
