import { cn } from "../lib/cn";

/**
 * SplitLayout (1.6.0, styling programme §4.6): a page's main column with a side column beside it
 * from `lg` (a record's form beside its preview, a document beside its facts), stacked below.
 * Renders exactly `grid items-start gap-6 lg:grid-cols-[1fr_minmax(20rem,26rem)]`; another side
 * width goes in `className` (`lg:grid-cols-[1fr_minmax(20rem,28rem)]` replaces the template).
 * Children: the main column first, then the side.
 */
export type SplitLayoutTag = "div" | "section" | "form";

export type SplitLayoutProps<T extends SplitLayoutTag = "div"> = {
  as?: T;
  className?: string;
} & Omit<React.ComponentProps<T>, "className" | "as">;

export const SPLIT_LAYOUT_CLASSES = "grid items-start gap-6 lg:grid-cols-[1fr_minmax(20rem,26rem)]";

export function SplitLayout<T extends SplitLayoutTag = "div">({ as, className, ...props }: SplitLayoutProps<T>) {
  const Tag = (as ?? "div") as React.ElementType;
  return <Tag className={cn(SPLIT_LAYOUT_CLASSES, className)} {...props} />;
}
