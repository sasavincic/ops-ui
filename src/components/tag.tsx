import { cn } from "@/lib/utils";

/**
 * A tag: a fact about the record that is not a status (Saša, 2026-09-07:
 * "included in the price" is not a status — no pill, no outline, no caps —
 * but not plain text either). A soft surface chip with an icon that says
 * WHAT the thing is; the icon is the part that earns it over plain text.
 * Pill shapes stay reserved for statuses (DESIGN.md).
 */
export function Tag({
  icon,
  tone = "neutral",
  className,
  title,
  children,
}: {
  icon?: React.ReactNode;
  tone?: "neutral" | "admin";
  className?: string;
  /** The full text when the chip truncates it. */
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-control px-2 py-1 text-detail",
        tone === "admin" ? "border border-admin/30 bg-admin-subtle text-admin" : "bg-surface text-ink",
        className
      )}
    >
      {icon && <span className={cn("inline-flex shrink-0", tone === "neutral" && "text-ink-secondary")}>{icon}</span>}
      {children}
    </span>
  );
}
