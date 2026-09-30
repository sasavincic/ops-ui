import { cn } from "@/lib/utils";

export function Card({
  className,
  variant = "solid",
  ...props
}: React.ComponentProps<"div"> & {
  /** ghost = dashed outline for placeholder cards (e.g. an unfilled seat). */
  variant?: "solid" | "ghost";
}) {
  return (
    <div
      className={cn(
        // min-w-0: as a grid/flex item a card must shrink below its
        // content's intrinsic width (long <select> options) — never force
        // horizontal scroll on phones.
        "min-w-0 rounded-container border bg-bg",
        variant === "ghost"
          ? "border-dashed border-border-strong"
          : "border-border",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-border px-5 py-3.5",
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2 className={cn("text-sm font-semibold text-ink", className)} {...props} />
  );
}

export function CardBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}
