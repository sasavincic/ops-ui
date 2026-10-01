import { GAP_CLASS, type Gap } from "../lib/gap";
import { cn } from "../lib/cn";

/**
 * Grid (1.6.0, styling programme §4.6): the grid recipes that recur in the apps - form fields in
 * two columns from `sm`, two cards side by side from `lg`. Every prop adds exactly its classes:
 * always `grid`; `gap` as Stack; `cols` (2 or 3) from a breakpoint (`from`: none = always, `"sm"`,
 * `"lg"`); `align="start"` → `items-start`. `<Grid gap={3} cols={2} from="sm">` renders
 * `grid gap-3 grid-cols-1 sm:grid-cols-2` (1.7.0: the explicit one column below `from`). A field
 * that spans both columns keeps `className="sm:col-span-2"`.
 */
export type GridTag = "div" | "section" | "ul" | "ol" | "dl" | "form" | "fieldset";
export type GridCols = 2 | 3;
export type GridFrom = "sm" | "lg";

/** The column classes, written out whole so Tailwind (which scans this file) generates them. */
export const GRID_COLS = {
  2: { base: "grid-cols-2", sm: "sm:grid-cols-2", lg: "lg:grid-cols-2" },
  3: { base: "grid-cols-3", sm: "sm:grid-cols-3", lg: "lg:grid-cols-3" },
} as const;

export type GridProps<T extends GridTag = "div"> = {
  as?: T;
  gap?: Gap;
  cols?: GridCols;
  /** The breakpoint the columns start at; none = at every width. Needs `cols`. */
  from?: GridFrom;
  align?: "start";
  className?: string;
} & Omit<React.ComponentProps<T>, "className" | "as" | "gap" | "cols">;

export function Grid<T extends GridTag = "div">({ as, gap, cols, from, align, className, ...props }: GridProps<T>) {
  const Tag = (as ?? "div") as React.ElementType;
  return (
    <Tag
      className={cn(
        "grid",
        gap !== undefined && GAP_CLASS[gap],
        align === "start" && "items-start",
        // 1.7.0: below `from` the grid is one explicit column, minmax(0, 1fr). The implicit track
        // was `auto`, whose items keep their content's width as a minimum: a control that scrolls
        // inside itself (Segmented) still pushed its row, and the page, wider on a phone. Where
        // the content fits, the column is the same width as before.
        cols !== undefined && from !== undefined && "grid-cols-1",
        cols !== undefined && GRID_COLS[cols][from ?? "base"],
        className
      )}
      {...props}
    />
  );
}
