import { GAP_CLASS, type Gap } from "../lib/gap";
import { cn } from "../lib/cn";

/**
 * Cluster: a row of things that wraps when it runs out of room (a toolbar, chips, a footer's
 * buttons; styling programme §4.4). Renders `flex`, `flex-wrap` (unless `wrap={false}`),
 * `items-center` (unless another `align`; `stretch` adds nothing), the `justify` class and
 * `gap-<n>`.
 */
export const CLUSTER_ALIGN = {
  center: "items-center",
  start: "items-start",
  baseline: "items-baseline",
  end: "items-end",
  stretch: null,
} as const;

export const CLUSTER_JUSTIFY = { start: null, between: "justify-between", end: "justify-end", center: "justify-center" } as const;

export type ClusterTag = "div" | "span" | "p" | "li" | "ul" | "nav";
export type ClusterAlign = keyof typeof CLUSTER_ALIGN;
export type ClusterJustify = keyof typeof CLUSTER_JUSTIFY;

export type ClusterProps<T extends ClusterTag = "div"> = {
  as?: T;
  gap?: Gap;
  /** Default true: the row wraps. */
  wrap?: boolean;
  /** Default "center". */
  align?: ClusterAlign;
  /** Default "start" (no class). */
  justify?: ClusterJustify;
  className?: string;
} & Omit<React.ComponentProps<T>, "className" | "as" | "gap" | "wrap" | "align" | "justify">;

export function Cluster<T extends ClusterTag = "div">({
  as,
  gap,
  wrap = true,
  align = "center",
  justify = "start",
  className,
  ...props
}: ClusterProps<T>) {
  const Tag = (as ?? "div") as React.ElementType;
  return (
    <Tag
      className={cn(
        "flex",
        wrap && "flex-wrap",
        CLUSTER_ALIGN[align],
        CLUSTER_JUSTIFY[justify],
        gap !== undefined && GAP_CLASS[gap],
        className,
      )}
      {...props}
    />
  );
}
