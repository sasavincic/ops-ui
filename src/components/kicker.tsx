import { cn } from "../lib/cn";

/**
 * A section or direction label (status doctrine 2026-09-25): uppercase
 * micro text, muted, optionally with a glyph. One recipe for the five the
 * app had grown. Never a status: it names a group, it does not judge it.
 */
export function Kicker({
  icon,
  as: Tag = "span",
  className,
  children,
}: {
  icon?: React.ReactNode;
  as?: "span" | "h3" | "h4" | "p" | "div";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag
      className={cn(
        "inline-flex items-center gap-1 text-micro font-medium tracking-wide text-ink-muted uppercase",
        className
      )}
    >
      {icon}
      {children}
    </Tag>
  );
}
