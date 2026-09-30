"use client";

import { useEffect, useRef } from "react";
import type { ActionIconName } from "@/components/ui/action-icon";
import { Button } from "@/components/ui/button";
import { useDict } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { ToastViewport, useErrorToast, useToastHost } from "@/components/ui/toast";

// Deliberately hard to dismiss (Saša, 2026-07-28): no backdrop-click close,
// no Escape — half-filled forms were getting lost. Only the X (and the
// dialog's own buttons) close it. Exit check (Saša, 2026-08-19): once
// anything inside has been typed, the X and a plain Cancel button ask
// before discarding.
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  confirmDiscard = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Optional pinned actions; form buttons can target a body form by id. */
  footer?: React.ReactNode;
  className?: string;
  /** Filter drafts can be discarded without a record-edit confirmation. */
  confirmDiscard?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const dirty = useRef(false);
  const t = useDict();
  // An open modal is the top layer: toasts must be drawn INSIDE it to sit
  // above it and stay clickable (toast.tsx).
  const toastHost = useToastHost(open);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dirty.current = false; // fresh open = clean slate
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Guard the in-dialog Cancel buttons too (capture phase): every dialog
  // renders its own `{t.common.cancel}` ghost button wired straight to its
  // close handler — the kit can't wrap those, so it recognizes them by
  // their exact label. Action buttons ("Cancel deployment"…) don't match.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const cancelLabel = t.common.cancel;
    const confirmText = t.common.unsavedConfirm;
    const onClick = (e: MouseEvent) => {
      if (!confirmDiscard || !dirty.current) return;
      const button = (e.target as Element | null)?.closest?.("button");
      if (!button || button.textContent?.trim() !== cancelLabel) return;
      if (confirm(confirmText)) {
        dirty.current = false;
      } else {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    dialog.addEventListener("click", onClick, true);
    return () => dialog.removeEventListener("click", onClick, true);
  }, [t.common.cancel, t.common.unsavedConfirm, confirmDiscard]);

  function closeFromX() {
    if (confirmDiscard && dirty.current && !confirm(t.common.unsavedConfirm)) return;
    dirty.current = false;
    onClose();
  }

  return (
    <dialog
      ref={ref}
      // React passes a nested dialog's close/cancel up the component tree
      // (portals included), so a dialog opened FROM another dialog closed
      // its host too (2026-09-29). Only this dialog's own events count.
      onClose={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onCancel={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        if (!confirmDiscard) onClose();
      }}
      onInputCapture={() => {
        dirty.current = true;
      }}
      onChangeCapture={() => {
        dirty.current = true;
      }}
      // Submission may return validation errors. Keep the discard guard until
      // the caller closes after success; a fresh open resets it above.
      className={cn(
        // hidden + open:flex keeps the UA's closed-state display:none intact;
        // the flex column + max-h let the BODY scroll while the header (and
        // its ✕ — the only dismiss control) stays pinned on short viewports.
        // whitespace-normal + text-left: the dialog renders WHERE IT IS
        // MOUNTED, so a table's trailing actions cell (nowrap, right-
        // aligned) inherits straight in — hints stop wrapping and the whole
        // form goes right-aligned (both found at 375px, 2026-09-21).
        "m-auto hidden max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md flex-col whitespace-normal rounded-container text-left border border-border bg-bg p-0 text-ink shadow-xl backdrop:bg-ink/40 open:flex",
        className
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border py-2 pl-5 pr-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <button
          type="button"
          aria-label={t.common.close}
          className="rounded-control p-2.5 text-sm leading-none text-ink-muted transition-colors duration-150 hover:bg-surface hover:text-ink"
          onClick={closeFromX}
        >
          ✕
        </button>
      </div>
      <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-4">
        {children}
      </div>
      {footer && (
        <div className="shrink-0 border-t border-border px-5 py-3">
          {footer}
        </div>
      )}
      {toastHost && <ToastViewport />}
    </dialog>
  );
}

/**
 * The dialog's interior, which the kit used to leave open — so its body
 * stack, its footer and its error line were copy-pasted across three
 * dozen files, and the footer is where the primary/secondary decision
 * gets made every time. Owning it here makes that decision once.
 */
export function DialogBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-col gap-4", className)}>{children}</div>;
}

/**
 * An action's refusal. Raised as a toast (bottom-right, dismissable) instead
 * of a line that pushes the dialog's content around (Saša, 2026-09-25);
 * renders nothing in the flow. `trigger` re-announces an unchanged message.
 */
export function DialogError({ children, trigger }: { children?: string | null; trigger?: unknown }) {
  useErrorToast(children, trigger);
  return null;
}

/**
 * Ghost escape on the left, the commit action rightmost. `variant`
 * follows the doctrine: `secondary` when the dialog changes something
 * that already exists (the common case), `primary` when it brings a new
 * record or commitment into being, `danger` when it removes data.
 */
export function DialogFooter({
  onClose,
  onSubmit,
  submitLabel,
  submitIcon = "check",
  closeLabel,
  variant = "secondary",
  pending = false,
  disabled = false,
  pendingLabel,
  form,
  /** Rendered left of the buttons — a hint, or why submit is unavailable. */
  note,
  /** Extra control on the left, e.g. an InlineConfirm delete. */
  children,
}: {
  onClose: () => void;
  onSubmit?: () => void;
  submitLabel: string;
  submitIcon?: ActionIconName;
  /**
   * Overrides the ghost escape's label for an escape that does NOT discard —
   * a two-stage confirm going "Back to form", say. Note the consequence: the
   * dialog's unsaved-changes guard recognises the escape by the exact word
   * "Cancel", so a relabelled one is not guarded. That is correct when the
   * escape keeps the user's work, and wrong for anything else.
   */
  closeLabel?: string;
  variant?: "primary" | "secondary" | "danger" | "admin";
  pending?: boolean;
  disabled?: boolean;
  /** Overrides "Saving…" when a surface has its own wording ("Deleting…"). */
  pendingLabel?: string;
  /** Associates a pinned submit button with the form in the dialog body. */
  form?: string;
  note?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const t = useDict();
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {children}
      {note && (
        <span className="mr-auto text-detail text-ink-muted">{note}</span>
      )}
      <Button icon={closeLabel ? "back" : "close"} type="button" variant="ghost" onClick={onClose}>
        {closeLabel ?? t.common.cancel}
      </Button>
      <Button
        type={onSubmit ? "button" : "submit"}
        form={form}
        variant={variant}
        icon={submitIcon}
        disabled={pending || disabled}
        onClick={onSubmit}
      >
        {pending ? (pendingLabel ?? t.common.saving) : submitLabel}
      </Button>
    </div>
  );
}
