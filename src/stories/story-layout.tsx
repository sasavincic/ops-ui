import { cn } from "../lib/cn";

// Layout for the stories only: a column of labelled rows. Not a kit component
// (no app imports it); it keeps every story laid out the same way.

/** The story's column. */
export function Stack({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-6", className)}>{children}</div>;
}

/** One labelled row of variants; wraps on narrow screens. */
export function Row({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className="flex flex-col gap-2">
      <p className="text-micro font-medium tracking-wide text-ink-muted uppercase">{label}</p>
      <div className={cn("flex flex-wrap items-center gap-3", className)}>{children}</div>
    </section>
  );
}
