import { cn } from "../lib/cn";

/**
 * The company chip (2026-09-09, one device with one meaning): a short code
 * in a bordered micro chip says WHICH COMPANY — the client on a board site
 * header, the employer on the worker list. Never a status, never a filter.
 * `tone="external"` tints a company that is not ours (a subcontractor) in
 * the "not ours" colour, --color-external (default: the brand accent), so
 * their people stand out in a list (Saša, 2026-09-09).
 * The full name travels in `title` and for screen readers.
 */
export function Monogram({
  code,
  title,
  tone = "own",
  className,
}: {
  code: string;
  title?: string;
  tone?: "own" | "external";
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex shrink-0 items-center rounded-sm border px-1 py-0.5 text-micro font-semibold tracking-wide",
        tone === "external"
          ? "border-external/50 bg-external/10 text-external"
          : "border-border bg-bg text-ink-secondary",
        className
      )}
    >
      {code}
      {title && <span className="sr-only"> {title}</span>}
    </span>
  );
}
