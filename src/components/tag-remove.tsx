"use client";

import { useReadOnlyScope } from "../config/read-only";
import { cn } from "../lib/cn";

/**
 * TagRemove (1.6.0, styling programme §4.6): the small ✕ at the end of a `Tag` that takes the
 * chip away (a counterparty on a rule, an invoice on a line). Place it as the Tag's last child,
 * with `className="pr-1"` on the Tag so the ✕ sits close to its edge. `Tag` itself stays
 * server-safe; this is its client part. The label names what goes ("Remove Kraftwerk Bau").
 *
 * Removing changes data, so inside a WriteScope the session cannot write to it renders NOTHING
 * unless `readOnlySafe` (a chip that only narrows a view, such as a filter).
 */
export function TagRemove({
  label,
  readOnlySafe,
  className,
  children = "✕",
  ...props
}: {
  /** The accessible name: what the ✕ removes. */
  label: string;
  readOnlySafe?: boolean;
} & Omit<React.ComponentProps<"button">, "aria-label">) {
  const hidden = useReadOnlyScope() && !readOnlySafe;
  if (hidden) return null;
  return (
    <button
      type="button"
      aria-label={label}
      className={cn("shrink-0 rounded-control px-1.5 text-ink-muted hover:bg-surface-raised hover:text-ink", className)}
      {...props}
    >
      {children}
    </button>
  );
}
