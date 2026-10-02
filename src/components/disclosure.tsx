"use client";

import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { TOUCH_FLOOR } from "../lib/touch";

/**
 * A section that folds (1.8.0, promoted from PrefabOps' `prefab-ui/disclosure.tsx`, restyle plan
 * G7, with its API unchanged so Prefab switches by import): the native `<details>` / `<summary>`,
 * so the browser owns the keyboard, the open state and find-in-page, drawn on kit tokens. The
 * summary row is a chevron, an optional `Kicker`-style label above the title ("Step 1"), the
 * title, and `meta` on the right (a `Tag`, an amount, a count). `bordered` draws its own container
 * (a stand-alone fold); without it the fold sits flush in a card, split from its siblings by the
 * card's hairlines. Controlled with `open` + `onToggle`, or left to the browser with
 * `defaultOpen`. `flushBody` drops the body's padding (a flush table, rows with their own);
 * `large` makes the summary row at least 48px tall at every width (an lg surface). Under the touch
 * floor the summary row is at least 44px tall. Opening a fold changes no data: it works in a
 * read-only scope.
 */
export function Disclosure({
  title,
  kicker,
  meta,
  open,
  defaultOpen,
  onToggle,
  bordered = false,
  className,
  bodyClassName,
  flushBody = false,
  large = false,
  children,
}: {
  title: ReactNode;
  /** A short uppercase label above the title. */
  kicker?: ReactNode;
  /** Right-hand facts of the summary row. */
  meta?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onToggle?: (open: boolean) => void;
  bordered?: boolean;
  className?: string;
  bodyClassName?: string;
  /** The body without padding: a flush table or rows that carry their own. */
  flushBody?: boolean;
  /** The summary row at least 48px tall at every width (the lg surface's size). */
  large?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      className={cn("group min-w-0", bordered && "rounded-container border border-border bg-bg", className)}
      open={open ?? defaultOpen}
      onToggle={onToggle ? (event) => onToggle(event.currentTarget.open) : undefined}
    >
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center gap-3 rounded-container outline-none transition-colors duration-150 hover:bg-surface focus-visible:ring-2 focus-visible:ring-primary/25 [&::-webkit-details-marker]:hidden",
          TOUCH_FLOOR.height,
          bordered ? "px-4 py-3" : "px-5 py-3.5",
          large && "min-h-12"
        )}
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 shrink-0 text-ink-muted transition-transform duration-150 group-open:rotate-90">
          <path d="m6 3.5 4.5 4.5L6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          {kicker ? <span className="text-micro font-medium tracking-wide text-ink-muted uppercase">{kicker}</span> : null}
          <span className="text-sm font-semibold break-words text-ink">{title}</span>
        </span>
        {meta ? <span className="flex shrink-0 items-center gap-2 text-detail text-ink-secondary">{meta}</span> : null}
      </summary>
      <div className={cn("border-t border-border", flushBody ? null : bordered ? "px-4 py-4" : "px-5 py-4", bodyClassName)}>{children}</div>
    </details>
  );
}
