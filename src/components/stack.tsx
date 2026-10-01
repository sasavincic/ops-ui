import { GAP_CLASS, type Gap } from "../lib/gap";
import { cn } from "../lib/cn";

/**
 * Stack: a vertical flex column with a gap (styling programme §4.4). Renders exactly
 * `flex flex-col` plus `gap-<n>`; no gap prop, no gap class.
 */
export type StackTag = "div" | "span" | "section" | "ul" | "ol" | "li" | "form" | "fieldset";

export type StackProps<T extends StackTag = "div"> = {
  as?: T;
  gap?: Gap;
  className?: string;
} & Omit<React.ComponentProps<T>, "className" | "as" | "gap">;

export function Stack<T extends StackTag = "div">({ as, gap, className, ...props }: StackProps<T>) {
  const Tag = (as ?? "div") as React.ElementType;
  return <Tag className={cn("flex flex-col", gap !== undefined && GAP_CLASS[gap], className)} {...props} />;
}
