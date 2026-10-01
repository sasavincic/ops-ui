"use client";

import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import { ReturnLink } from "./back-link";
import { ActionIcon, type ActionIconName } from "./action-icon";
import { useReadOnlyScope } from "../config/read-only";
import { cn } from "../lib/cn";
import { TOUCH_FLOOR } from "../lib/touch";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5 rounded-control font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    // The opt-in touch floor (lib/touch.ts): 44px tall under [data-ops-touch] on a screen that
    // cannot hover; it paints nothing anywhere else.
    TOUCH_FLOOR.height,
  ],
  {
    variants: {
      variant: {
        primary: "bg-primary text-white hover:bg-primary-hover",
        secondary:
          "border border-border-strong bg-bg text-ink hover:bg-surface",
        ghost: "text-ink-secondary hover:bg-surface hover:text-ink",
        // Destructive-but-quiet: reads like ghost until hovered, then warns.
        ghostDanger: "text-ink-secondary hover:bg-danger/10 hover:text-danger",
        // Privileged actions retain violet; compact triggers use AdminIconButton.
        admin:
          "border border-admin/50 bg-admin-subtle text-admin hover:bg-admin/15",
        danger: "bg-danger text-white hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3 text-detail",
        md: "h-9 px-3.5 text-sm",
        // 1.3.0: 48px with 16px text, the workshop portal's controls (PrefabOps plan §7.8).
        lg: "h-12 px-4 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

/**
 * A button inside a WriteScope the session cannot write to renders NOTHING
 * (2026-08-28). Default-deny on purpose: the alternative is remembering to
 * gate each of ~200 controls by hand, and one forgotten button is exactly
 * the dead end Saša reported. A control that changes no data — Copy, Show
 * all, a filter — says so with readOnlySafe.
 */
type ReadOnlyProps = { readOnlySafe?: boolean; icon?: ActionIconName };

/** The glyph of a button: 14px, 16px on a large button. sm and md keep exactly the 1.2 markup. */
function ButtonIcon({ name, size }: { name: ActionIconName; size: "sm" | "md" | "lg" | null | undefined }) {
  return <ActionIcon name={name} className={size === "lg" ? "size-4" : undefined} />;
}

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> &
  ReadOnlyProps;

export function Button({
  className,
  variant,
  size,
  readOnlySafe,
  icon,
  children,
  ...props
}: ButtonProps) {
  const hidden = useReadOnlyScope() && !readOnlySafe;
  if (hidden) return null;
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {icon && <ButtonIcon name={icon} size={size} />}
      {children}
    </button>
  );
}

type ButtonLinkProps = React.ComponentProps<typeof Link> &
  VariantProps<typeof buttonVariants> &
  ReadOnlyProps & { returnNavigation?: boolean };

export function ButtonLink({
  className,
  variant,
  size,
  readOnlySafe,
  icon,
  children,
  returnNavigation,
  ...props
}: ButtonLinkProps) {
  const hidden = useReadOnlyScope() && !readOnlySafe;
  if (hidden) return null;
  if (returnNavigation && typeof props.href === "string") {
    return (
      <ReturnLink {...props} href={props.href} className={cn(buttonVariants({ variant, size }), className)}>
        {icon && <ButtonIcon name={icon} size={size} />}
        {children}
      </ReturnLink>
    );
  }
  return (
    <Link
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {icon && <ButtonIcon name={icon} size={size} />}
      {children}
    </Link>
  );
}

/**
 * A button-styled plain anchor for links that leave the app — tel:, sms:,
 * mailto:, WhatsApp, Viber (a Next Link would try to route them). It
 * changes no data, so it shows in read-only scopes too.
 */
export function ExternalButtonLink({
  className,
  variant,
  size,
  icon,
  children,
  ...props
}: React.ComponentProps<"a"> &
  VariantProps<typeof buttonVariants> & { icon?: ActionIconName }) {
  return (
    <a className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {icon && <ButtonIcon name={icon} size={size} />}
      {children}
    </a>
  );
}

/**
 * Reading an existing file: always available in read-only scopes, with the same
 * quiet appearance on every surface. A native anchor preserves file handling,
 * new-tab commands and downloads without Next.js prefetching a PDF endpoint.
 */
export function FileLink({
  href,
  children,
  size = "sm",
  className,
  disabled = false,
  target = "_blank",
  rel = "noopener noreferrer",
  ...props
}: Omit<React.ComponentProps<"a">, "href"> & {
  href?: string;
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  const classes = cn(buttonVariants({ variant: "ghost", size }), className);
  const content = <><ActionIcon name="document" always />{children}</>;
  if (disabled || !href) {
    return <span role="link" aria-disabled="true" aria-label={props["aria-label"]}
      title={props.title} className={cn(classes, "cursor-not-allowed opacity-50")}>{content}</span>;
  }
  return <a {...props} href={href} target={target} rel={rel} className={classes}>{content}</a>;
}

/** The square of each IconButton size: the Button heights, as wide as they are tall. */
const ICON_BUTTON_SIZE = {
  sm: "size-8 px-0",
  md: "size-9 px-0",
  lg: "size-12 px-0",
} as const;

/**
 * An icon-only button (1.3.0; PrefabOps restyle plan G4). The glyph is the whole control, so the
 * `label` is required: it becomes the accessible name (`aria-label`) and the tooltip (`title`),
 * which a touch screen never shows, hence never a substitute for a visible word where one fits.
 * Square at sm (32px), md (36px) and lg (48px); ghost unless another Button variant is asked for.
 * Read-only aware like Button (renders nothing in a read-only scope unless `readOnlySafe`), and
 * the touch floor makes it 44 x 44 under [data-ops-touch] on a screen that cannot hover. The
 * glyph is always drawn, even inside `ActionIconScope enabled={false}`: it IS the button.
 */
export function IconButton({
  label,
  icon,
  variant = "ghost",
  size = "md",
  readOnlySafe,
  className,
  type = "button",
  ...props
}: Omit<React.ComponentProps<"button">, "children" | "aria-label" | "title"> & {
  label: string;
  icon: ActionIconName;
  variant?: NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
  size?: "sm" | "md" | "lg";
  readOnlySafe?: boolean;
}) {
  const hidden = useReadOnlyScope() && !readOnlySafe;
  if (hidden) return null;
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(buttonVariants({ variant, size }), ICON_BUTTON_SIZE[size], TOUCH_FLOOR.width, className)}
      {...props}
    >
      <ActionIcon name={icon} always className={size === "lg" ? "size-5" : undefined} />
    </button>
  );
}

/** Plain privileged trigger; semantic button, labelled icon and expanded hit area. */
export function AdminIconButton({
  label,
  icon = "edit",
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "children"> & {
  label: string;
  icon?: "edit" | "delete" | "unlock" | "permissions" | "key" | "deactivate" | "reactivate";
}) {
  const hidden = useReadOnlyScope();
  if (hidden) return null;
  const paths = {
    edit: "m10.5 2.5 3 3-8 8-4 1 1-4zM9 4l3 3",
    delete: "M2 4h12M6 4V2h4v2M4 4l.5 10h7L12 4M6.5 6.5v5M9.5 6.5v5",
    unlock: "M6 7V4a3 3 0 0 1 6 0M3 7h10v7H3zM8 10v1.5",
    permissions:
      "M8 1.5 14 4v4c0 3-3 5-6 6.5C5 13 2 11 2 8V4zM5.5 8l1.5 1.5 3.5-3.5",
    key: "M10 9a3.5 3.5 0 1 0-3-3L1.5 11.5v3h3v-2h2v-2z",
    // An account that can't sign in: the circle crossed out.
    deactivate: "M14.5 8a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0M3.4 3.4l9.2 9.2",
    reactivate: "M2 6h7a4 4 0 0 1 0 8H6M5 3 2 6l3 3",
  };
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "relative inline-flex size-4 shrink-0 items-center justify-center self-center border-0 bg-transparent p-0 text-admin transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-admin disabled:pointer-events-none disabled:opacity-50 after:absolute after:-inset-1",
        className,
      )}
      {...props}
    >
      <svg
        aria-hidden="true"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={paths[icon]} />
      </svg>
    </button>
  );
}
