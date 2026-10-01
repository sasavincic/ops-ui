import { cn } from "../lib/cn";

/**
 * Heading: the three heading recipes the apps repeat (styling programme §4.4). A page's own
 * title is PageHeader's; an uppercase section label is Kicker.
 */
export const HEADING_LEVEL = {
  /** A stand-alone card's title (the sign-in pages): h1. */
  title: { tag: "h1", className: "text-lg font-semibold tracking-tight text-ink" },
  /** A section of a page or a card: h2. */
  section: { tag: "h2", className: "text-sm font-semibold text-ink" },
  /** A group inside a section or a sheet: h3. */
  subsection: { tag: "h3", className: "text-xs font-medium text-ink-secondary" },
} as const;

export type HeadingLevel = keyof typeof HEADING_LEVEL;

export function Heading({
  level,
  as,
  className,
  ...props
}: {
  level: HeadingLevel;
  /** The element, when the outline needs another than the level's default. */
  as?: "h1" | "h2" | "h3" | "h4";
} & React.ComponentProps<"h2">) {
  const { tag, className: base } = HEADING_LEVEL[level];
  const Tag = as ?? tag;
  return <Tag className={cn(base, className)} {...props} />;
}
