"use client";

// One confirm, everywhere (doctrine 2026-08-27). Before this, the same
// three-part shape — a sentence naming the record, an error slot and a
// ghost/commit button pair — was hand-written in a dozen tabs, and a few
// destructive actions fell back to the browser's own confirm(), which
// cannot be styled, cannot be translated and reads as a bug on touch.

import { Button } from "./button";
import {
  Dialog,
  DialogBody,
  DialogError,
  DialogFooter,
} from "./dialog";
import { useDict } from "@/i18n/client";

/**
 * A destructive action that lives INSIDE an open dialog, where a second
 * modal would be wrong. First click arms it, and the question appears in
 * place with its own escape — the same two-step contract as
 * ConfirmDialog, without leaving the surface.
 */
export function InlineConfirm({
  label,
  question,
  confirmLabel,
  pending = false,
  onConfirm,
  armed,
  onArm,
}: {
  label: string;
  question: string;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  armed: boolean;
  onArm: (armed: boolean) => void;
}) {
  const t = useDict();
  if (!armed) {
    return (
      <Button icon="delete" variant="ghostDanger" onClick={() => onArm(true)}>
        {label}
      </Button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-detail text-ink-secondary">{question}</span>
      <Button icon="close" variant="ghost" onClick={() => onArm(false)}>
        {t.common.cancel}
      </Button>
      <Button icon="delete" variant="danger" disabled={pending} onClick={onConfirm}>
        {pending ? t.common.saving : confirmLabel}
      </Button>
    </span>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  body,
  confirmLabel,
  /** Doctrine: `danger` removes data, `secondary` changes what exists. */
  variant = "danger",
  pending = false,
  error = null,
  onConfirm,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** The sentence that says what will happen, naming the record. */
  body?: React.ReactNode;
  confirmLabel: string;
  variant?: "danger" | "secondary" | "primary";
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  /** Extra fields — a date input, a checkbox — above the buttons. */
  children?: React.ReactNode;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <DialogBody>
        {body && <p className="text-sm text-ink-secondary">{body}</p>}
        {children}
        <DialogError>{error}</DialogError>
        <DialogFooter
          onClose={onClose}
          onSubmit={onConfirm}
          submitLabel={confirmLabel}
          submitIcon={variant === "danger" ? "delete" : "check"}
          variant={variant}
          pending={pending}
        />
      </DialogBody>
    </Dialog>
  );
}
