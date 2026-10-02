"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "../lib/cn";
import { TOUCH_FLOOR } from "../lib/touch";

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
 *
 * 1.8.0: a row without `href` reads no router at all, and a row with one
 * renders without a mounted App Router too (a static render, a unit test):
 * the click then falls back to a plain page load.
 */
export function TR({ href, className, onClick, ...props }: React.ComponentProps<"tr"> & { href?: string }) {
  if (!href) return <tr className={cn(className)} onClick={onClick} {...props} />;
  return <LinkedTR href={href} className={className} onClick={onClick} {...props} />;
}

/** The router, or null outside a mounted App Router (useRouter throws there). */
function useOptionalRouter(): ReturnType<typeof useRouter> | null {
  try {
    return useRouter();
  } catch {
    return null;
  }
}

function LinkedTR({
  className,
  href,
  onClick,
  ...props
}: React.ComponentProps<"tr"> & { href: string }) {
  const router = useOptionalRouter();
  return (
    <tr
      className={cn("cursor-pointer transition-colors duration-150 hover:bg-surface", className)}
      onClick={(e) => {
        onClick?.(e);
        // Real links/buttons inside the row keep their own behavior.
        if ((e.target as HTMLElement).closest("a, button")) return;
        if (router) router.push(href);
        else window.location.assign(href);
      }}
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

/**
 * A group's own row in a grouped table (1.8.0; PrefabOps' material prices and cost ledger): a
 * surface band with the group's name, an optional muted `count` beside it and optional `meta` on
 * the right. Spanning the table it is a heading row: give it `colSpan` = the number of columns.
 * With `children` the label takes only its own cell (or `colSpan` columns) and the children are
 * the row's further cells, lined up with the columns (a group's total under the amount column).
 *
 * With `onToggle` the label is a toggle that folds the group's rows (a `<details>` cannot wrap
 * table rows): a chevron, `aria-expanded` from `open`; the caller leaves the folded rows out.
 * Folding is view state, so the toggle shows in a read-only scope too.
 */
export function TGroupRow({
  label,
  count,
  meta,
  colSpan,
  open,
  onToggle,
  className,
  children,
}: {
  label: React.ReactNode;
  /** A muted number after the label (the group's rows). */
  count?: React.ReactNode;
  /** Right-hand facts of a spanning heading row ("3 articles"). */
  meta?: React.ReactNode;
  /** The columns the label's cell spans. */
  colSpan?: number;
  /** With `onToggle`: whether the group's rows are shown. */
  open?: boolean;
  onToggle?: () => void;
  className?: string;
  /** Further cells after the label's, lined up with the table's columns. */
  children?: React.ReactNode;
}) {
  const name = (
    <>
      <span>{label}</span>
      {count !== undefined && count !== null && (
        <span className="font-normal tabular-nums text-ink-muted">{count}</span>
      )}
    </>
  );
  return (
    <tr className={cn("bg-surface", className)} data-group-row="">
      <td colSpan={colSpan} className="px-4 py-1.5">
        <span className="flex items-center justify-between gap-3">
          {onToggle ? (
            <button
              type="button"
              aria-expanded={Boolean(open)}
              onClick={onToggle}
              className={cn(
                "-mx-1.5 inline-flex items-center gap-1.5 rounded-control px-1.5 py-1 text-left text-sm font-semibold text-ink transition-colors duration-150 hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                TOUCH_FLOOR.height
              )}
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14"
                className={cn("shrink-0 text-ink-muted transition-transform duration-150", open && "rotate-90")}>
                <path d="m6 3.5 4.5 4.5L6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {name}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">{name}</span>
          )}
          {meta && <span className="shrink-0 text-detail text-ink-secondary">{meta}</span>}
        </span>
      </td>
      {children}
    </tr>
  );
}

/** The table's foot (1.8.0): ruled off from the body by a strong hairline. Holds a `TTotalRow`. */
export function TFoot({ className, ...props }: React.ComponentProps<"tfoot">) {
  return <tfoot className={cn("border-t border-border-strong", className)} {...props} />;
}

/**
 * The total row of a `TFoot` (1.8.0): the label's cell (spanning `labelColSpan` columns), then the
 * caller's cells lined up with the columns, all semibold: `<TD numeric>` for the amount, an empty
 * `<TD />` under a trailing actions column.
 */
export function TTotalRow({
  label,
  labelColSpan,
  className,
  children,
}: {
  label: React.ReactNode;
  labelColSpan?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <tr className={cn("font-semibold", className)}>
      <td colSpan={labelColSpan} className="px-4 py-3 text-sm text-ink">
        {label}
      </td>
      {children}
    </tr>
  );
}
