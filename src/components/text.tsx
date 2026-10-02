import { cn } from "../lib/cn";

/**
 * Text: one line or paragraph of text in a named size and tone (styling programme §4.4).
 * Every prop adds exactly its classes and nothing else, so `<Text as="p" size="detail"
 * tone="muted">` renders the same element as `<p className="text-detail text-ink-muted">`.
 */
export const TEXT_SIZE = { body: "text-sm", detail: "text-detail", micro: "text-micro" } as const;

export const TEXT_TONE = {
  ink: "text-ink",
  secondary: "text-ink-secondary",
  muted: "text-ink-muted",
  warning: "text-warning",
  danger: "text-danger",
  success: "text-success",
} as const;

export const TEXT_WEIGHT = { normal: "font-normal", medium: "font-medium", semibold: "font-semibold" } as const;

export type TextSize = keyof typeof TEXT_SIZE;
export type TextTone = keyof typeof TEXT_TONE;
export type TextWeight = keyof typeof TEXT_WEIGHT;
/** 1.8.0: the heading elements too, for a heading that wears a Text look (`<Text as="h3" weight="medium">`). */
export type TextTag = "span" | "p" | "div" | "li" | "dt" | "dd" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export type TextStyleProps = {
  size?: TextSize;
  tone?: TextTone;
  weight?: TextWeight;
  /** Geist Mono: document numbers, codes, money columns. */
  mono?: boolean;
  /** `display: block`, e.g. a second line under a name inside an inline cell. */
  block?: boolean;
  /** One line with an ellipsis (needs a width: a block or a min-w-0 flex child). */
  truncate?: boolean;
  /** 1.6.0: never wraps (`whitespace-nowrap`): a date, an amount, a short code. */
  nowrap?: boolean;
  /** 1.6.0: digits of equal width (`tabular-nums`), so figures line up row under row. */
  tabular?: boolean;
};

/** The classes of the style props, in a fixed order (size, tone, weight, mono, block, truncate, nowrap, tabular). */
export function textClasses({ size, tone, weight, mono, block, truncate, nowrap, tabular }: TextStyleProps): string[] {
  return [
    size && TEXT_SIZE[size],
    tone && TEXT_TONE[tone],
    weight && TEXT_WEIGHT[weight],
    mono && "font-mono",
    block && "block",
    truncate && "truncate",
    nowrap && "whitespace-nowrap",
    tabular && "tabular-nums",
  ].filter((c): c is string => Boolean(c));
}

export type TextProps<T extends TextTag = "span"> = TextStyleProps & {
  as?: T;
  className?: string;
} & Omit<React.ComponentProps<T>, "className" | keyof TextStyleProps | "as">;

export function Text<T extends TextTag = "span">({
  as,
  size,
  tone,
  weight,
  mono,
  block,
  truncate,
  nowrap,
  tabular,
  className,
  ...props
}: TextProps<T>) {
  const Tag = (as ?? "span") as React.ElementType;
  const classes = cn(textClasses({ size, tone, weight, mono, block, truncate, nowrap, tabular }), className);
  return <Tag className={classes || undefined} {...props} />;
}
