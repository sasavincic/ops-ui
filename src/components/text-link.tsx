import Link from "next/link";
import { cn } from "../lib/cn";
import { TEXT_SIZE, type TextSize } from "./text";

/**
 * TextLink: a link inside text (styling programme §4.4). An internal path renders next/link's
 * Link; an address with a scheme (https:, mailto:, tel:) or starting with // renders a plain <a>.
 * Nothing is added beyond the variant's classes (no target, no rel: pass them).
 */
export const TEXT_LINK_VARIANT = {
  /** Underlined, turns ink on hover: a quiet link in supporting text. */
  quiet: "underline underline-offset-2 hover:text-ink",
  /** Underlined in the surrounding colour. */
  underline: "underline underline-offset-2",
  /** The primary colour, underlined on hover. */
  primary: "text-primary hover:underline",
  /** The surrounding colour, underlined on hover. */
  plain: "hover:underline",
  /** A record's name outside a table (RowLink's classes). */
  strong: "font-medium text-ink hover:underline",
  /** 1.6.0: secondary ink, primary on hover (the sign-in pages' secondary actions). */
  muted: "text-ink-secondary hover:text-primary",
} as const;

export type TextLinkVariant = keyof typeof TEXT_LINK_VARIANT;

/** True for an address the router does not handle: a scheme (https:, mailto:) or `//host`. */
export function isExternalHref(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//");
}

export function TextLink({
  href,
  variant,
  size,
  className,
  ...props
}: {
  href: string;
  variant: TextLinkVariant;
  size?: TextSize;
} & Omit<React.ComponentProps<"a">, "href">) {
  const classes = cn(TEXT_LINK_VARIANT[variant], size && TEXT_SIZE[size], className);
  if (isExternalHref(href)) return <a href={href} className={classes} {...props} />;
  return <Link href={href} className={classes} {...props} />;
}
