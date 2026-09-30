import { cn } from "../lib/cn";

export function DescriptionList({
  className,
  ...props
}: React.ComponentProps<"dl">) {
  return (
    <dl
      className={cn(
        "grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[10rem_1fr]",
        className
      )}
      {...props}
    />
  );
}

export function DT({ className, ...props }: React.ComponentProps<"dt">) {
  return (
    <dt
      className={cn("text-detail text-ink-muted sm:pt-px", className)}
      {...props}
    />
  );
}

export function DD({ className, ...props }: React.ComponentProps<"dd">) {
  return <dd className={cn("text-sm text-ink", className)} {...props} />;
}

/**
 * A value that may not have been filled in yet. Overviews say it in words
 * ("Not set") rather than with the table's `—`, because an overview is where
 * you go to find out whether something is recorded — and this was
 * hand-written four times and hand-inlined three more, which is how the same
 * blank started reading three different ways.
 *
 * Pages are server components, so the caller passes the translated label.
 */
export function Value({
  value,
  notSet,
}: {
  value: string | null | undefined;
  notSet: string;
}) {
  if (!value) return <NotSet label={notSet} />;
  return <>{value}</>;
}

/** The same "nothing recorded" rendering, for values with a fallback chain. */
export function NotSet({ label }: { label: string }) {
  return <span className="text-ink-muted">{label}</span>;
}
