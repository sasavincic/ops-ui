import type { ReactNode } from "react";
import { Table, TBody, TD, TH, THead, TR } from "./table";
import { cn } from "../lib/cn";

/**
 * FoldTable (1.8.0, promoted from PrefabOps' `ReviewGrid`, restyle plan G12 / P4.6b): a dense table
 * described by its columns, for rows of kit controls (an editable worksheet) or compact facts. Cells
 * are compact, numbers right-aligned and tabular, the first column sticky while the table scrolls
 * sideways. Where a table no longer fits, each row FOLDS into a block of labelled cells: the same
 * DOM, the header's words riding each cell as a label that only the folded layout shows (hidden from
 * screen readers; a control in a cell carries its own `aria-label`).
 *
 * `fold` says what decides: `"md"` (default) the viewport (a table from md, blocks below), or
 * `"container"` the table's OWN width (a `@container`: blocks below 32rem, a table from 32rem; written as `@max-[32rem]:` / `@min-[32rem]:`, values, so no app declares a container theme variable it never uses), for
 * a table in a pane whose width the viewport does not tell (an editor beside a drawing). In a
 * container fold a row is six columns wide and `foldSpan` sets a column's width in it (numbers
 * default to half, the rest to the whole row). `flush` drops the table's own border for a table
 * that sits directly in a card (folded rows are split by hairlines instead of boxed). `headerAction`
 * puts a small control after a column's header words (an apply-to-all); folded rows never show it.
 *
 * Server-safe: no hooks; `cell` is called where the table renders.
 */
export type FoldTableSpan = 1 | 2 | 3 | 4 | 5 | 6;

/** Written out whole so Tailwind generates them. */
const FOLD_SPAN: Record<FoldTableSpan, string> = {
  1: "@max-[32rem]:col-span-1",
  2: "@max-[32rem]:col-span-2",
  3: "@max-[32rem]:col-span-3",
  4: "@max-[32rem]:col-span-4",
  5: "@max-[32rem]:col-span-5",
  6: "@max-[32rem]:col-span-6",
};

export type FoldTableColumn<T> = {
  key: string;
  header: string;
  /** A number or money column: right-aligned, tabular figures. */
  numeric?: boolean;
  /** Width classes for the column as a table (`md:w-32`). */
  className?: string;
  /** No label in a folded row (a trailing actions cell); the header stays for screen readers. */
  bare?: boolean;
  /** `fold="container"`: the column's width in a folded row, in sixths (numbers 3, the rest 6). */
  foldSpan?: FoldTableSpan;
  /** A control after the header's words (an apply-to-all); never in folded rows. */
  headerAction?: ReactNode;
  cell: (row: T, index: number) => ReactNode;
};

export type FoldTableProps<T> = {
  /** Names the table for screen readers. */
  label: string;
  columns: readonly FoldTableColumn<T>[];
  rows: readonly T[];
  rowKey: (row: T, index: number) => string;
  rowId?: (row: T, index: number) => string | undefined;
  rowClassName?: (row: T, index: number) => string | undefined;
  /** Sits directly in a card: no border of its own; folded rows split by hairlines, not boxed. */
  flush?: boolean;
  /** What the rows fold by: the viewport (`"md"`, default) or the table's own width (`"container"`). */
  fold?: "md" | "container";
};

export function FoldTable<T>({ fold = "md", ...props }: FoldTableProps<T>) {
  return fold === "container" ? <ContainerFold {...props} /> : <ViewportFold {...props} />;
}

type Inner<T> = Omit<FoldTableProps<T>, "fold">;

function ViewportFold<T>({ label, columns, rows, rowKey, rowId, rowClassName, flush = false }: Inner<T>) {
  return (
    <Table
      aria-label={label}
      className="max-md:block"
      containerClassName={cn("max-md:overflow-visible max-md:rounded-none max-md:border-0 max-md:bg-transparent", flush && "rounded-none border-0")}
    >
      <THead className="bg-surface max-md:hidden">
        <tr>
          {columns.map((column, index) => (
            <TH
              key={column.key}
              alignRight={column.numeric}
              className={cn("px-2 py-2", flush ? "first:pl-5 last:pr-5" : "first:pl-3 last:pr-3", index === 0 && "md:sticky md:left-0 md:z-10 md:bg-surface", column.className)}
            >
              {column.bare ? <span className="sr-only">{column.header}</span> : column.header}
              {column.headerAction ? <span className="ml-1 inline-flex align-middle">{column.headerAction}</span> : null}
            </TH>
          ))}
        </tr>
      </THead>
      <TBody className={flush ? "divide-y divide-border max-md:flex max-md:flex-col" : "divide-y divide-border max-md:flex max-md:flex-col max-md:gap-3 max-md:divide-y-0"}>
        {rows.map((row, rowIndex) => (
          <TR
            key={rowKey(row, rowIndex)}
            id={rowId?.(row, rowIndex)}
            className={cn(
              "max-md:grid max-md:grid-cols-2 max-md:gap-3",
              flush ? "max-md:px-5 max-md:py-4" : "max-md:rounded-container max-md:border max-md:border-border max-md:bg-bg max-md:p-4",
              rowClassName?.(row, rowIndex)
            )}
          >
            {columns.map((column, index) => (
              <TD
                key={column.key}
                alignRight={column.numeric}
                className={cn(
                  flush ? "px-2 py-2 align-top first:pl-5 last:pr-5" : "px-2 py-1.5 align-top first:pl-3 last:pr-3",
                  "max-md:col-span-2 max-md:p-0 max-md:text-left max-md:first:pl-0 max-md:last:pr-0",
                  column.numeric && "tabular-nums max-md:col-span-1",
                  index === 0 && "md:sticky md:left-0 md:z-10 md:bg-bg",
                  column.className
                )}
              >
                {column.bare ? null : <span aria-hidden="true" className="mb-1 block text-detail font-medium text-ink md:hidden">{column.header}</span>}
                {column.cell(row, rowIndex)}
              </TD>
            ))}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

function ContainerFold<T>({ label, columns, rows, rowKey, rowId, rowClassName, flush = false }: Inner<T>) {
  return (
    <div className="@container min-w-0">
      <Table
        aria-label={label}
        className="@max-[32rem]:block"
        containerClassName={cn("@max-[32rem]:overflow-visible @max-[32rem]:rounded-none @max-[32rem]:border-0 @max-[32rem]:bg-transparent", flush && "rounded-none border-0")}
      >
        <THead className="bg-surface @max-[32rem]:hidden">
          <tr>
            {columns.map((column, index) => (
              <TH
                key={column.key}
                alignRight={column.numeric}
                className={cn("px-2 py-2", flush ? "first:pl-5 last:pr-5" : "first:pl-3 last:pr-3", index === 0 && "@min-[32rem]:sticky @min-[32rem]:left-0 @min-[32rem]:z-10 @min-[32rem]:bg-surface", column.className)}
              >
                {column.bare ? <span className="sr-only">{column.header}</span> : column.header}
                {column.headerAction ? <span className="ml-1 inline-flex align-middle">{column.headerAction}</span> : null}
              </TH>
            ))}
          </tr>
        </THead>
        <TBody className={flush ? "divide-y divide-border @max-[32rem]:flex @max-[32rem]:flex-col" : "divide-y divide-border @max-[32rem]:flex @max-[32rem]:flex-col @max-[32rem]:gap-3 @max-[32rem]:divide-y-0"}>
          {rows.map((row, rowIndex) => (
            <TR
              key={rowKey(row, rowIndex)}
              id={rowId?.(row, rowIndex)}
              className={cn(
                "@max-[32rem]:grid @max-[32rem]:grid-flow-row-dense @max-[32rem]:grid-cols-6 @max-[32rem]:gap-x-3 @max-[32rem]:gap-y-2.5",
                flush ? "@max-[32rem]:px-5 @max-[32rem]:py-4" : "@max-[32rem]:rounded-container @max-[32rem]:border @max-[32rem]:border-border @max-[32rem]:bg-bg @max-[32rem]:p-4",
                rowClassName?.(row, rowIndex)
              )}
            >
              {columns.map((column, index) => (
                <TD
                  key={column.key}
                  alignRight={column.numeric}
                  className={cn(
                    flush ? "px-2 py-2 align-top first:pl-5 last:pr-5" : "px-2 py-1.5 align-top first:pl-3 last:pr-3",
                    "@max-[32rem]:p-0 @max-[32rem]:text-left @max-[32rem]:first:pl-0 @max-[32rem]:last:pr-0",
                    FOLD_SPAN[column.foldSpan ?? (column.numeric ? 3 : 6)],
                    column.numeric && "tabular-nums",
                    index === 0 && "@min-[32rem]:sticky @min-[32rem]:left-0 @min-[32rem]:z-10 @min-[32rem]:bg-bg",
                    column.className
                  )}
                >
                  {column.bare ? null : <span aria-hidden="true" className="mb-1 block text-detail font-medium text-ink @min-[32rem]:hidden">{column.header}</span>}
                  {column.cell(row, rowIndex)}
                </TD>
              ))}
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
