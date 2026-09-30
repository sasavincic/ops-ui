"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { ActionIcon, type ActionIconName } from "./action-icon";
import { Button } from "./button";
import { useDismissable } from "@/lib/use-dismissable";
import { cn } from "../lib/cn";

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

export function RowMenu({
  label,
  items,
  className,
}: {
  /** The accessible name of the ⋯ button ("Row actions"). */
  label: string;
  items: RowMenuItem[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<{ top: number; right: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  useDismissable(open, wrapRef, () => setOpen(false));

  // Measure before paint so the menu never flashes in the wrong place, and
  // follow the button while the page scrolls (closing on scroll shut it the
  // moment a tap nudged the page on a phone).
  useLayoutEffect(() => {
    if (!open) return;
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
      setPlace({ top, right: Math.max(8, window.innerWidth - rect.right) });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  if (items.length === 0) return null;
  return (
    <div
      ref={wrapRef}
      className={cn("relative inline-flex", className)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
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
        className="px-2"
      >
        {/* The dots ARE the button — always drawn, even where decorative
            action icons are off (Settings, workspaces rendered it empty). */}
        <ActionIcon name="more" always />
      </Button>
      {open && (
        <ul
          ref={menuRef}
          role="menu"
          style={place ? { top: place.top, right: place.right } : { visibility: "hidden" }}
          className="fixed z-40 w-52 max-w-[calc(100vw-2rem)] rounded-control border border-border bg-bg py-1 shadow-lg"
        >
          {items.map((item) => (
            <li key={item.key} role="none">
              {item.href ? (
                <Link
                  role="menuitem"
                  href={item.href}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-ink hover:bg-surface"
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
                    item.danger ? "text-danger hover:bg-danger/10" : "text-ink"
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
          ))}
        </ul>
      )}
    </div>
  );
}
