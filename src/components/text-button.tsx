"use client";

import { useReadOnlyScope } from "../config/read-only";
import { cn } from "../lib/cn";
import { TEXT_SIZE, TEXT_TONE, type TextSize, type TextTone } from "./text";
import { TEXT_LINK_VARIANT, type TextLinkVariant } from "./text-link";

/**
 * TextButton (1.6.0, styling programme §4.6): a `<button>` that reads like a link inside text -
 * "+ alternative rate", "Show all", "Use another method". It carries exactly `TextLink`'s classes
 * for its variant, plus `size` and `tone` as `Text` has them, so replacing a hand-styled
 * `<button className="text-detail text-ink-muted underline underline-offset-2 hover:text-ink">`
 * with `<TextButton variant="quiet" size="detail" tone="muted">` renders the same element.
 *
 * Like `Button`: no default `type` (pass `type="button"` inside a form), and inside a WriteScope the
 * session cannot write to it renders NOTHING unless `readOnlySafe` (a button that changes no data:
 * a disclosure, a filter, "Show all").
 */
export function TextButton({
  variant,
  size,
  tone,
  readOnlySafe,
  className,
  ...props
}: {
  variant: TextLinkVariant;
  size?: TextSize;
  tone?: TextTone;
  readOnlySafe?: boolean;
} & React.ComponentProps<"button">) {
  const hidden = useReadOnlyScope() && !readOnlySafe;
  if (hidden) return null;
  return (
    <button
      className={cn(TEXT_LINK_VARIANT[variant], size && TEXT_SIZE[size], tone && TEXT_TONE[tone], className)}
      {...props}
    />
  );
}
