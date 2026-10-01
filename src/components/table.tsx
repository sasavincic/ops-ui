"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "../lib/cn";

export function Table({ className, containerClassName, ...props }: React.ComponentProps<"table"> & {
  /** Fixed, responsive tables can let row menus overflow without a nested scrollbar. */
  containerClassName?: string;
}) {
  return (
    <div className={cn("overflow-x-auto rounded-container border border-border bg-bg", containerClassName)}>
      <table className={cn("w-full text-sm", className)} {...props} />
    </div>
  );
}

export function THead({ ...props }: React.ComponentProps<"thead">) {
  return <thead className="bg-surface" {...props} />;
}

export function TBody({ ...props }: React.ComponentProps<"tbody">) {
  return <tbody className="divide-y divide-border" {...props} />;
}

/**
 * Rows with `href` navigate on click anywhere in the row. Navigation is a
 * JS handler, NOT a stretched-link overlay: Safari ignores position:relative
 * on <tr>, which made overlay-based rows swallow clicks on unrelated UI
 * (e.g. tabs above the table). The RowLink inside stays a real anchor for
 * keyboard access, middle-click and long-press.
 */
export function TR({
  className,
  href,
  onClick,
  ...props
}: React.ComponentProps<"tr"> & { href?: string }) {
  const router = useRouter();
  return (
    <tr
      className={cn(
        href && "cursor-pointer transition-colors duration-150 hover:bg-surface",
        className
      )}
      onClick={
        href
          ? (e) => {
              onClick?.(e);
              // Real links/buttons inside the row keep their own behavior.
              if ((e.target as HTMLElement).closest("a, button")) return;
              router.push(href);
            }
          : onClick
      }
      {...props}
    />
  );
}

/** The breakpoint below which a column is hidden (1.2): `hidden <bp>:table-cell`. */
export const CELL_HIDE_BELOW = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
} as const;

export type CellHideBelow = keyof typeof CELL_HIDE_BELOW;

/**
 * Column props (1.2, all optional; without them a cell renders exactly as before):
 * `hideBelow` hides the column on narrow screens, `alignRight` right-aligns it (on TH it takes
 * the place of the base `text-left`, as `className="text-right"` always did).
 */
export type CellProps = { hideBelow?: CellHideBelow; alignRight?: boolean };

export function TH({ className, hideBelow, alignRight, ...props }: React.ComponentProps<"th"> & CellProps) {
  return (
    <th
      className={cn(
        "px-4 py-2.5 text-left text-xs font-medium text-ink-secondary",
        alignRight && "text-right",
        hideBelow && CELL_HIDE_BELOW[hideBelow],
        className
      )}
      {...props}
    />
  );
}

/** `numeric` (1.2): a number or money column, `text-right font-mono`. */
export function TD({
  className,
  hideBelow,
  alignRight,
  numeric,
  ...props
}: React.ComponentProps<"td"> & CellProps & { numeric?: boolean }) {
  return (
    <td
      className={cn(
        "px-4 py-3 align-middle text-ink",
        (alignRight || numeric) && "text-right",
        numeric && "font-mono",
        hideBelow && CELL_HIDE_BELOW[hideBelow],
        className
      )}
      {...props}
    />
  );
}

/** The row's primary link — pair with a TR `href` for whole-row clicks. */
export function RowLink({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn("font-medium text-ink hover:underline", className)}
      {...props}
    >
      {children}
    </Link>
  );
}
