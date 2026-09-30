import { cn } from "@/lib/utils";
import { StatusIcon, type StatusIconName } from "@/components/ui/status-icon";

/**
 * The Attention column (2026-09-09, Saša: "something generic, used with all
 * records for something requiring action or asking for attention"). A
 * short list of what needs doing on the record — one line per item, a
 * glyph in the item's tone, no pills (a pill is a status; this is a
 * to-do). Empty means nothing to do, and renders nothing: the silent
 * default. The same component is meant to be the LAST column of every
 * record list.
 */
export type AttentionItem = {
  tone: "danger" | "warning";
  text: string;
  /** Defaults: danger = problem (wrong now), warning = clock (coming).
   * Missing data passes "question" — information not recorded yet. */
  icon?: StatusIconName;
};

export function AttentionList({
  items,
  className,
}: {
  items: AttentionItem[];
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <ul className={cn("flex flex-col gap-0.5", className)}>
      {items.map((item, i) => (
        <li
          key={i}
          className={cn(
            "flex items-start gap-1.5 text-detail",
            item.tone === "danger" ? "text-danger" : "text-warning"
          )}
        >
          <StatusIcon name={item.icon ?? (item.tone === "danger" ? "problem" : "clock")} className="mt-0.5" />
          <span className="min-w-0">{item.text}</span>
        </li>
      ))}
    </ul>
  );
}
