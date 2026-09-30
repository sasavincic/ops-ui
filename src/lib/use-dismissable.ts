"use client";

import { useEffect, type RefObject } from "react";

/**
 * Close a hand-rolled popover/menu on any pointer press outside `ref`.
 * Blur-based closing never fires on iOS Safari — it does not focus a
 * button on tap — so an open menu otherwise floats until the trigger is
 * re-tapped. Listens only while `open`.
 */
export function useDismissable(
  open: boolean,
  ref: RefObject<HTMLElement | null>,
  onClose: () => void
) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, ref, onClose]);
}
