"use client";

import Link from "next/link";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { ActionIcon, type ActionIconName } from "./action-icon";
import { Button } from "./button";
import { useDismissable } from "../lib/use-dismissable";
import { cn } from "../lib/cn";
import { TOUCH_FLOOR } from "../lib/touch";

/**
 * The row kebab (⋯): the secondary and destructive actions of ONE row,
 * folded behind a single control so they never read as part of the data
 * beside them (Saša, 2026-09-11 — Edit/Delete looked like columns). Born
 * on the flightboard (2026-08-27), promoted to the kit so record tables
 * and desk rows share one menu. Items carry an explicit icon; a `danger`
 * item is red. A kit Button, so a read-only scope hides the whole menu.
 *
 * The list FLOATS (position: fixed at the button, 2026-09-28): rows sit
 * inside rounded `overflow-hidden` lists and scrolling table wrappers,
 * which clipped an absolutely positioned menu on the last row. It opens
 * below the button, or above when the viewport has no room below, and
 * follows its button while the page scrolls.
 *
 * 1.4.0 (PrefabOps restyle plan G8): an optional `trigger` replaces the ⋯
 * with a labelled button (a toolbar's "AI tools ▾"), and optional
 * `sections` add headed groups after the ungrouped `items`, each set off
 * by a hairline. Placement, flip-up, follow-scroll and every way of
 * closing are the same for all three shapes; a menu with no room left of
 * its button's right edge lines up with the button's left edge instead.
 * Without either prop the menu renders exactly the 1.3 markup.
 *
 * 1.8.0: the open list is a manual popover in the top layer (see the layout effect): it escapes
 * every containing block and stacking context an ancestor can create.
 */
export type RowMenuItem = {
  key: string;
  label: string;
  icon: ActionIconName;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
};

/** A group of a RowMenu (1.4.0): an optional heading, set off from what precedes it by a hairline. */
export type RowMenuSection = {
  key: string;
  /** A short heading over the group ("Current page", "Bulk actions"). */
  heading?: string;
  items: RowMenuItem[];
};

/** A labelled trigger in place of the ⋯ (1.4.0). */
export type RowMenuTrigger = {
  /** The visible label and the button's accessible name; progress may ride it ("Extracting 2/5…"). */
  label: string;
  icon?: ActionIconName;
  /** Default "secondary". */
  variant?: "secondary" | "ghost" | "primary";
  /** Default "sm", the ⋯'s size. */
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
};

type Place = { top: number; right: number; left?: undefined } | { top: number; left: number; right?: undefined };

export function RowMenu({
  label,
  items = [],
  sections = [],
  trigger,
  className,
}: {
  /** The accessible name of the ⋯ button ("Row actions"); with a `trigger`, the trigger's title. */
  label: string;
  /** The ungrouped items, first. */
  items?: RowMenuItem[];
  /** Groups after the items, each with an optional heading (1.4.0). */
  sections?: RowMenuSection[];
  /** A labelled button instead of the ⋯ (1.4.0). */
  trigger?: RowMenuTrigger;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const headingId = useId();
  useDismissable(open, wrapRef, () => setOpen(false));

  // Measure before paint so the menu never flashes in the wrong place, and
  // follow the button while the page scrolls (closing on scroll shut it the
  // moment a tap nudged the page on a phone).
  useLayoutEffect(() => {
    if (!open) return;
    // 1.8.0: the list lives in the TOP LAYER (a manual popover), so no ancestor can capture it:
    // a `transform`, `filter` or `backdrop-filter` ancestor becomes the containing block of a
    // position: fixed element and threw the list off screen (PrefabOps' sticky action bar, P4.6b),
    // and a parent's overflow or z-index cannot clip or bury it. Inside a modal Dialog it opens
    // above the dialog (both are top layer; the later one is on top). Where popovers are not
    // supported it stays the 1.7 fixed list.
    const list = menuRef.current;
    if (list && typeof list.showPopover === "function" && !list.matches(":popover-open")) {
      list.showPopover();
    }
    const place = () => {
      const button = wrapRef.current?.querySelector("button");
      const menu = menuRef.current;
      if (!button || !menu) return;
      const rect = button.getBoundingClientRect();
      const height = menu.offsetHeight;
      const gap = 4;
      const below = rect.bottom + gap;
      const top =
        below + height > window.innerHeight - 8 && rect.top - gap - height >= 8
          ? rect.top - gap - height
          : below;
      const right = Math.max(8, window.innerWidth - rect.right);
      // A menu that would leave the screen on the left (a labelled trigger
      // near the left edge) lines up with the button's left edge instead.
      if (window.innerWidth - right - menu.offsetWidth < 8) {
        setPlace({ top, left: Math.max(8, Math.min(rect.left, window.innerWidth - menu.offsetWidth - 8)) });
      } else {
        setPlace({ top, right });
      }
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  const groups = sections.filter((section) => section.items.length > 0);
  if (items.length === 0 && groups.length === 0) return null;

  const renderItem = (item: RowMenuItem) => (
    <li key={item.key} role="none">
      {item.href ? (
        <Link
          role="menuitem"
          href={item.href}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 text-sm text-ink hover:bg-surface", TOUCH_FLOOR.height)}
          onClick={() => setOpen(false)}
        >
          <ActionIcon name={item.icon} />
          {item.label}
        </Link>
      ) : (
        <button
          type="button"
          role="menuitem"
          disabled={item.disabled}
          className={cn(
            "flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-sm hover:bg-surface disabled:opacity-50",
            item.danger ? "text-danger hover:bg-danger/10" : "text-ink",
            // 1.7.0: items are 44px tall under the touch floor (32px otherwise, unchanged).
            TOUCH_FLOOR.height
          )}
          onClick={() => {
            setOpen(false);
            item.onClick?.();
          }}
        >
          <ActionIcon name={item.icon} />
          {item.label}
        </button>
      )}
    </li>
  );

  return (
    <div
      ref={wrapRef}
      className={cn("relative inline-flex", className)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      {trigger ? (
        <Button
          type="button"
          variant={trigger.variant ?? "secondary"}
          size={trigger.size ?? "sm"}
          icon={trigger.icon}
          title={label}
          disabled={trigger.disabled}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => {
            setPlace(null);
            setOpen((v) => !v);
          }}
        >
          {trigger.label}
          <svg aria-hidden="true" width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70">
            <path d="m4 6 4 4 4-4" />
          </svg>
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={label}
          title={label}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => {
            setPlace(null);
            setOpen((v) => !v);
          }}
          // The trigger is icon-only: under the touch floor it is 44 x 44 (Button brings the height).
          className={cn("px-2", TOUCH_FLOOR.width)}
        >
          {/* The dots ARE the button — always drawn, even where decorative
              action icons are off (Settings, workspaces rendered it empty). */}
          <ActionIcon name="more" always />
        </Button>
      )}
      {open && (
        <ul
          ref={menuRef}
          role="menu"
          popover="manual"
          style={place ? (place.left === undefined ? { top: place.top, right: place.right } : { top: place.top, left: place.left }) : { visibility: "hidden" }}
          // inset-auto + m-0: the popover UA sheet centres a popover (inset: 0, margin: auto); the
          // inline top / right (or left) place it at the button as before. Its ::backdrop takes no
          // pointer, so a press outside still reaches the page (and closes the menu).
          className="fixed inset-auto z-[var(--ops-z-menu,40)] m-0 w-52 max-w-[calc(100vw-2rem)] overflow-visible rounded-control border border-border bg-bg py-1 text-ink shadow-lg backdrop:pointer-events-none"
        >
          {items.map(renderItem)}
          {groups.map((section, index) => {
            const id = section.heading ? `${headingId}-${section.key}` : undefined;
            return (
              <li key={section.key} role="none" className={cn((index > 0 || items.length > 0) && "mt-1 border-t border-border pt-1")}>
                <ul role="group" aria-labelledby={id}>
                  {section.heading && (
                    <li
                      id={id}
                      role="presentation"
                      className="px-3 pt-1 pb-0.5 text-micro font-medium tracking-wide text-ink-muted uppercase"
                    >
                      {section.heading}
                    </li>
                  )}
                  {section.items.map(renderItem)}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
