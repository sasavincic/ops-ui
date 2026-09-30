import { cn } from "../lib/cn";

/**
 * One set of record actions, two placements (DESIGN.md, 2026-07-15): render
 * the SAME node inside PageHeader's `actions` via HeaderActions (visible
 * from `sm` up) and after the content via BottomActions (phones only —
 * thumbs finish a form at the bottom, not back at the top).
 */
export function HeaderActions({ children }: { children: React.ReactNode }) {
  return (
    <span className="hidden flex-wrap items-center justify-end gap-2 sm:flex">
      {children}
    </span>
  );
}

export function BottomActions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-2 sm:hidden",
        className
      )}
    >
      {children}
    </div>
  );
}
