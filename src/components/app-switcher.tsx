"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { StatusIcon } from "./status-icon";
import { useOpsUi } from "../config/provider";
import { EN_OPTIONAL_STRINGS } from "../config/strings";
import { OPS_APPS, type OpsApp, type OpsAppId } from "../lib/apps";
import { useDismissable } from "../lib/use-dismissable";
import { cn } from "../lib/cn";

export type { OpsApp, OpsAppId };

/**
 * The app switcher (library 1.1.0, spec §10): the app's own mark becomes a
 * button that opens a menu of the suite's apps. Each entry is a colour dot
 * (the app's sidebar colour), its name and a plain same-tab link; the
 * current app is listed without a link, with a check. An app without a
 * URL (not deployed yet) is not listed. No fetch, no cookie, no shared
 * sign-in: each app still asks for its own login.
 *
 * The menu floats like RowMenu's (position: fixed at the trigger, upward
 * when the viewport has no room below, following the trigger on scroll),
 * closes on an outside press, Tab or Escape (Escape returns focus to the
 * trigger) and walks with ArrowDown / ArrowUp / Home / End. It changes no
 * data, so a read-only scope never hides it.
 */
export function AppSwitcher({
  current,
  mark,
  apps = OPS_APPS,
  className,
}: {
  current: OpsAppId;
  /** The app's own mark or wordmark, rendered inside the trigger. */
  mark: React.ReactNode;
  /** Default OPS_APPS (tests and the gallery pass their own). */
  apps?: readonly OpsApp[];
  className?: string;
}) {
  const { strings } = useOpsUi();
  const words = strings.appSwitcher ?? EN_OPTIONAL_STRINGS.appSwitcher;
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  useDismissable(open, wrapRef, () => setOpen(false));

  // The current app is always listed (it needs no URL: it has no link);
  // another app only once it has one.
  const listed = apps.filter((app) => app.id === current || app.href !== null);
  const currentName = apps.find((app) => app.id === current)?.name;

  const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  // Measure before paint so the menu never flashes in the wrong place, and
  // follow the trigger while the page scrolls.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;
      const rect = trigger.getBoundingClientRect();
      const height = menu.offsetHeight;
      const width = menu.offsetWidth;
      const gap = 4;
      const below = rect.bottom + gap;
      const top =
        below + height > window.innerHeight - 8 && rect.top - gap - height >= 8
          ? rect.top - gap - height
          : below;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      setPlace({ top, left });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  // Once the menu is placed (and so visible), focus the current app's entry,
  // or the first: the arrows walk from there.
  const placed = place !== null;
  useLayoutEffect(() => {
    if (!open || !placed) return;
    const entries = items();
    (entries.find((el) => el.getAttribute("aria-current") === "page") ?? entries[0])?.focus();
  }, [open, placed]);

  function onMenuKeyDown(e: React.KeyboardEvent) {
    const entries = items();
    const at = entries.indexOf(document.activeElement as HTMLElement);
    const go = (i: number) => {
      e.preventDefault();
      entries[(i + entries.length) % entries.length]?.focus();
    };
    if (e.key === "ArrowDown") go(at + 1);
    else if (e.key === "ArrowUp") go(at < 0 ? entries.length - 1 : at - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(entries.length - 1);
    else if (e.key === "Tab") setOpen(false);
  }

  return (
    <div
      ref={wrapRef}
      className={cn("relative inline-flex", className)}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={currentName ? `${words.label}: ${currentName}` : words.label}
        className="inline-flex items-center rounded-control text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={() => {
          setPlace(null);
          setOpen((v) => !v);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setPlace(null);
            setOpen(true);
          }
        }}
      >
        {mark}
      </button>
      {open && (
        <ul
          ref={menuRef}
          role="menu"
          aria-label={words.label}
          onKeyDown={onMenuKeyDown}
          // Off-screen, not visibility: hidden, until measured: a hidden entry
          // cannot take focus, and under reduced motion base.css turns the
          // visibility flip itself into a (0.01ms) transition.
          style={place ? { top: place.top, left: place.left } : { top: -9999, left: -9999 }}
          className="fixed z-40 w-56 max-w-[calc(100vw-2rem)] rounded-control border border-border bg-bg py-1 shadow-lg"
        >
          {listed.map((app) => {
            const isCurrent = app.id === current;
            const body = (
              <>
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: app.color }}
                />
                <span className="min-w-0 flex-1 truncate">{app.name}</span>
                {isCurrent && <StatusIcon name="check" className="text-primary" />}
              </>
            );
            const itemClass =
              "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-ink outline-none hover:bg-surface focus-visible:bg-surface pointer-coarse:py-3";
            return (
              <li key={app.id} role="none">
                {isCurrent || app.href === null ? (
                  <span
                    role="menuitem"
                    tabIndex={-1}
                    aria-current="page"
                    title={words.current}
                    className={cn(itemClass, "font-medium")}
                  >
                    {body}
                  </span>
                ) : (
                  <a role="menuitem" tabIndex={-1} href={app.href} className={itemClass}>
                    {body}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
