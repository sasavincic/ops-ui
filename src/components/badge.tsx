import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";
import { StatusIcon } from "./status-icon";
import type { BadgeVariant, StatusIconName } from "../types";

const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium leading-4 whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "border-border-strong/70 bg-surface text-ink-secondary",
        success: "border-success/30 bg-success-subtle text-success",
        warning: "border-warning/30 bg-warning-subtle text-warning",
        danger: "border-danger/30 bg-danger-subtle text-danger",
        info: "border-info/30 bg-info-subtle text-info",
      } satisfies Record<BadgeVariant, string>,
    },
    defaultVariants: { variant: "neutral" },
  }
);

export type { BadgeVariant };

/**
 * A STATUS pill: the current lifecycle position of the record it sits on
 * (status doctrine 2026-09-25). Always a word AND its status icon — the
 * icon is required, there is no per-colour fallback glyph (a fallback made
 * "Scheduled" wear a clock that meant nothing). Categories use Tag or an
 * icon-and-word, validity and attention are lines, identities Monogram.
 */
export function Badge({
  className, variant = "neutral", icon, appearance = "tinted", children, ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & {
  icon: StatusIconName;
  /** outline = the exception in a list or on a row (StateMark). */
  appearance?: "tinted" | "outline";
}) {
  return (
    <span className={cn(badgeVariants({ variant }), appearance === "outline" && "bg-transparent", className)} {...props}>
      <StatusIcon name={icon} />
      {children}
    </span>
  );
}
