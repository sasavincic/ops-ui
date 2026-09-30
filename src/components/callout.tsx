import { StatusIcon, type StatusIconName } from "@/components/ui/status-icon";
import { cn } from "@/lib/utils";

/**
 * THE alert surface (redesigned 2026-09-28, Saša: "can we redesign them to
 * match the toast design?"). One component for both kinds of alert:
 *
 * - a FIXED alert sits in the flow of a page or dialog because of what the
 *   record IS — a health line, a warning before a decision, a gate listing
 *   what a document still needs, a locked-record banner;
 * - a TOAST (toast.tsx) floats bottom-right because of what someone just
 *   DID, and renders this same box with `floating` + a close button.
 *
 * The look is the toast's: page-coloured card, a hairline border in the
 * tone, the tone's glyph leading, the message in ink. The colour lives in
 * the border and the glyph — never a tinted fill — so an in-page alert and
 * a toast read as the same thing. Tone follows the colour doctrine: danger
 * = wrong now / blocking, warning = needs a look or a decision, info =
 * context, success = done (toasts), neutral = a plain fact, admin = the
 * violet escape hatches.
 */
export type CalloutTone = "danger" | "warning" | "info" | "success" | "neutral" | "admin";

export const CALLOUT_TONE: Record<
  CalloutTone,
  { border: string; ink: string; icon: StatusIconName }
> = {
  danger: { border: "border-danger/40", ink: "text-danger", icon: "problem" },
  warning: { border: "border-warning/40", ink: "text-warning", icon: "question" },
  info: { border: "border-info/40", ink: "text-info", icon: "info" },
  success: { border: "border-success/40", ink: "text-success", icon: "check" },
  neutral: { border: "border-border-strong", ink: "text-ink-muted", icon: "info" },
  admin: { border: "border-admin/40", ink: "text-admin", icon: "key" },
};

export function Callout({
  tone = "neutral",
  title,
  icon,
  className,
  bodyClassName,
  floating = false,
  trailing,
  children,
  role,
}: {
  tone?: CalloutTone;
  /** Leads the message in medium weight; the body follows on the same line
   * when it is short, or below it when it is a block. */
  title?: React.ReactNode;
  /** Overrides the tone's glyph where the fact has its own (a lock). */
  icon?: StatusIconName;
  /** The box itself: margins, width. */
  className?: string;
  /** The message column: layout of what the caller puts inside. */
  bodyClassName?: string;
  /** A toast: lifted off the page with a shadow. */
  floating?: boolean;
  /** Right-hand control (a toast's ✕). */
  trailing?: React.ReactNode;
  children?: React.ReactNode;
  role?: "status" | "alert";
}) {
  const t = CALLOUT_TONE[tone];
  return (
    <div
      role={role}
      className={cn(
        "flex items-start gap-2.5 rounded-container border bg-bg py-2.5 pl-3 text-detail text-ink",
        trailing ? "pr-1.5" : "pr-3",
        floating && "shadow-lg",
        t.border,
        className
      )}
    >
      <StatusIcon name={icon ?? t.icon} className={cn("mt-0.5", t.ink)} />
      <div className={cn("min-w-0 flex-1 break-words", bodyClassName)}>
        {title && <span className="font-medium">{title}</span>}
        {title && children ? " " : null}
        {children}
      </div>
      {trailing}
    </div>
  );
}
