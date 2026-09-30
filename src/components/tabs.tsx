import Link from "next/link";
import { cn } from "../lib/cn";

export type TabItem = {
  key: string;
  label: string;
  /** How many items the tab holds. Always that — never swapped for an
   * alarm count, which made one grey pill mean two opposite things. */
  count?: number;
  /** How many of them need attention: colours the count, never replaces
   * the number. Pass the label so the tooltip can say what it means. */
  attention?: number;
  /** The attention's severity — red only when something is wrong now,
   * amber when it is only coming (status doctrine 2026-09-25). */
  attentionTone?: "danger" | "warning";
  attentionLabel?: string;
};

/** URL-driven tabs: server-friendly, each tab is a link. */
export function Tabs({
  items,
  active,
  hrefFor,
}: {
  items: TabItem[];
  active: string;
  hrefFor: (key: string) => string;
}) {
  return (
    // The grey rule is a layer behind the links (not a border the links must
    // overhang): nothing protrudes below the scroller, so the overflow-x-auto
    // needed on narrow screens can never spawn a vertical scrollbar.
    <div className="relative">
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 border-b border-border"
      />
      {/* Phones: a right-edge fade hints that more tabs sit off-screen —
          scrollbars are hidden on iOS, so without it the extra tabs are
          undiscoverable. Anchored to the non-scrolling wrapper, ignores taps. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-bg to-transparent sm:hidden"
      />
      <nav
        className="relative flex gap-1 overflow-x-auto overflow-y-hidden"
        aria-label="Tabs"
      >
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <Link
            key={item.key}
            href={hrefFor(item.key)}
            // A tab is view state of ONE page, not a page of its own: it
            // replaces the history entry, so the browser's back (and the
            // trail, which already keeps one entry per path) leaves the
            // record instead of stepping through every tab you opened
            // (Saša, 2026-09-22: "looping").
            replace
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors duration-150",
              isActive
                ? "border-primary font-medium text-ink"
                : "border-transparent text-ink-secondary hover:border-border-strong hover:text-ink"
            )}
          >
            {item.label}
            {/* A zero adds noise — show plain-text counts only
                when there is something to count. A tab whose content is
                not a countable collection may still carry its ALARM:
                passed as `attention` alone, never as `count` (status
                doctrine 2026-09-25 — a grey number means "items", a
                coloured one "need attention"). */}
            {item.count === undefined && item.attention !== undefined && item.attention > 0 && (
              <span
                title={item.attentionLabel}
                className={cn(
                  "px-1 text-xs font-medium tabular-nums",
                  item.attentionTone === "danger" ? "text-danger" : "text-warning"
                )}
              >
                {item.attention}
              </span>
            )}
            {item.count !== undefined && item.count > 0 && (
              <span
                title={
                  item.attention && item.attention > 0
                    ? item.attentionLabel
                    : undefined
                }
                className={cn(
                  "px-1 text-xs tabular-nums",
                  item.attention && item.attention > 0
                    ? item.attentionTone === "warning"
                      ? "font-medium text-warning"
                      : "font-medium text-danger"
                    : isActive
                      ? "text-primary"
                      : "text-ink-muted"
                )}
              >
                {item.count}
              </span>
            )}
          </Link>
        );
      })}
      </nav>
    </div>
  );
}
