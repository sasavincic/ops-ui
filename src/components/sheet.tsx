"use client";

import { useId, useRef } from "react";
import { useOpsUi } from "../config/provider";
import { cn } from "../lib/cn";
import { useErrorToast } from "./toast";

/**
 * Right-hand slide-over — the desk's second surface next to the Dialog:
 * backdrop, a panel pinned to the right edge (full-width on phones,
 * ~520px from `sm` up), a header that never scrolls away and a scrolling
 * body. Chrome only; the interior is `SheetBody` / `SheetError` /
 * `SheetFooter` below, so no caller re-decides padding or an error line.
 *
 * Close semantics follow the Dialog kit (Saša, 2026-07-28): the ✕ is the
 * ONLY way out — no backdrop click, no Escape — because a sheet holds
 * half-edited forms. (The ⌘K palette closes on both by design; it is not a
 * sheet.) All three current sheets agree on this, so it is the primitive's
 * fixed behaviour rather than a prop; a sheet that ever needs to close on
 * Escape should say so here, once, for everyone.
 *
 * `exitCheck` adds the Dialog's discard prompt (2026-08-19) for sheets that
 * edit records in place: typing anything arms it, the ✕ then asks before
 * throwing the edit away, and a click on a plain `{strings.save}` button
 * (exact label, capture phase — the kit cannot wrap buttons it does not
 * render) disarms it again.
 */
export function Sheet({
  title,
  badge,
  toolbar,
  headerActions,
  contentKey,
  exitCheck = false,
  onClose,
  children,
  className,
}: {
  title: React.ReactNode;
  /** Status badge shown beside the title. */
  badge?: React.ReactNode;
  /** Persistent context/navigation below the title, outside the scroller. */
  toolbar?: React.ReactNode;
  /** Navigation beside the title; separate from the heading semantics. */
  headerActions?: React.ReactNode;
  /** Reset body state and scroll when navigating within the same sheet. */
  contentKey?: string;
  /** Ask before discarding typed-but-unsaved edits. */
  exitCheck?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const { strings } = useOpsUi();
  const titleId = useId();
  const dirty = useRef(false);

  function arm() {
    dirty.current = true;
  }

  function disarmOnSave(e: React.MouseEvent) {
    const button = (e.target as Element | null)?.closest?.("button");
    if (button && button.textContent?.trim() === strings.save) {
      dirty.current = false;
    }
  }

  /** `dirty` can only ever arm when `exitCheck` wired the guards above. */
  function closeFromX() {
    if (dirty.current && !confirm(strings.unsavedConfirm)) return;
    dirty.current = false;
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40">
      <div aria-hidden className="absolute inset-0 bg-ink/40" />
      <aside
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        className={cn(
          "absolute inset-y-0 right-0 flex w-full flex-col bg-bg shadow-xl sm:max-w-[520px] sm:border-l sm:border-border",
          className
        )}
        onInputCapture={exitCheck ? arm : undefined}
        onChangeCapture={exitCheck ? arm : undefined}
        onClickCapture={exitCheck ? disarmOnSave : undefined}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 id={titleId} className="text-sm font-semibold break-words text-ink">
              {title}
            </h2>
            {badge}
          </span>
          {headerActions}
          {/* Dialog-kit ✕ target (~40px) — the only way out of the sheet, so
              it sits outside the scroller and can never scroll away. */}
          <button
            type="button"
            aria-label={strings.close}
            className="shrink-0 rounded-control p-2.5 text-sm leading-none text-ink-muted transition-colors duration-150 hover:bg-surface hover:text-ink"
            onClick={closeFromX}
          >
            ✕
          </button>
        </header>
        {toolbar}
        {/* The body scrolls; the extra bottom padding on phones keeps the
            last row clear of the thumb rail. */}
        <div key={contentKey} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 pb-24 sm:pb-4">
          {children}
        </div>
      </aside>
    </div>
  );
}

/** The body stack: the sheet's sections, one rhythm for all of them. */
export function SheetBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-col gap-5", className)}>{children}</div>;
}

/** A section-level error. Field-level errors belong in the Field's error slot. */
/** An action's refusal inside a sheet — a toast, like DialogError. */
export function SheetError({ children, trigger }: { children?: string | null; trigger?: unknown }) {
  useErrorToast(children, trigger);
  return null;
}

/**
 * The sheet's own bottom row — the action that belongs to the whole record
 * rather than to a section (today: Delete), ruled off from the content above.
 * It sits at the END of the body, not pinned: a destructive action should be
 * scrolled to, never parked permanently under the reader's thumb.
 */
export function SheetFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-t border-border pt-3", className)}>
      {children}
    </div>
  );
}
