"use client";

import { useReadOnlyScope } from "../config/read-only";
import { useOpsUi } from "../config/provider";
import { cn } from "../lib/cn";
import { StatusIcon } from "./status-icon";
import { useAnchoredToast } from "./toast";

export const controlClasses =
  "w-full rounded-control border border-border-strong bg-bg px-3 text-base lg:text-sm text-ink placeholder:text-ink-muted transition-colors duration-150 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:bg-surface disabled:text-ink-muted aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/25";

export function Field({
  label,
  htmlFor,
  error,
  warning,
  hint,
  announceWarning = false,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  /** Raised as a toast "Label: message" (alerts are toasts, 2026-09-25);
   *  the label itself turns red so the field is still findable. */
  error?: string;
  /** A value that needs a second look (a scan read at medium confidence,
   *  2026-09-11): the label turns amber, focusing the field shows why.
   *  Raised on focus only unless announceWarning — a scan's own toast
   *  already lists the doubted fields. */
  warning?: string;
  hint?: string;
  /** Raise the warning as a toast as soon as it appears (a rule the pick
   *  just broke), not only on focus. */
  announceWarning?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  // Server-side refusals arrive in English; the kit translates them.
  const { strings, localize } = useOpsUi();
  const closeLabel = strings.close;
  const say = (text?: string) =>
    text ? `${label}: ${localize(text)}` : null;
  const reannounceError = useAnchoredToast(say(error), "danger", true, closeLabel);
  const reannounceWarning = useAnchoredToast(
    error ? null : say(warning),
    "warning",
    announceWarning,
    closeLabel
  );
  const mark = error ? "error" : warning ? "warning" : null;
  return (
    // min-w-0: a Field is usually a grid/flex child, whose default
    // min-width:auto lets a long hint push the column wider than its
    // container instead of wrapping (found at 375px, 2026-09-21).
    // Nothing is added or removed below the control when a message
    // arrives: the message is a toast, the field only changes colour.
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1.5",
        mark === "error" &&
          "[&_input]:border-danger [&_select]:border-danger [&_textarea]:border-danger",
        mark === "warning" &&
          "[&_input]:border-warning [&_select]:border-warning [&_textarea]:border-warning",
        className
      )}
      data-field-state={mark ?? undefined}
      onFocusCapture={() => {
        if (error) reannounceError();
        else if (warning) reannounceWarning();
      }}
    >
      <label
        htmlFor={htmlFor}
        className={cn(
          "inline-flex items-center gap-1 text-detail font-medium",
          mark === "error" ? "text-danger" : mark === "warning" ? "text-warning" : "text-ink"
        )}
      >
        {mark && <StatusIcon name={mark === "error" ? "problem" : "question"} />}
        {label}
      </label>
      {children}
      {hint && <p className="text-detail text-ink-muted">{hint}</p>}
    </div>
  );
}

/**
 * Fields inside a WriteScope the session cannot write to come up DISABLED
 * (2026-08-28) — hiding them would hide the data they carry, but leaving
 * them typable invites filling in a month of hours with no way to save.
 * A field that only narrows what is displayed says readOnlySafe.
 */
type ReadOnlyProps = { readOnlySafe?: boolean };

function useLocked(readOnlySafe?: boolean): boolean {
  return useReadOnlyScope() && !readOnlySafe;
}

export function Input({
  className,
  readOnlySafe,
  ...props
}: React.ComponentProps<"input"> & ReadOnlyProps) {
  const locked = useLocked(readOnlySafe);
  return (
    <input
      className={cn(controlClasses, "h-9", className)}
      {...props}
      disabled={props.disabled || locked}
    />
  );
}

export function Select({
  className,
  readOnlySafe,
  ...props
}: React.ComponentProps<"select"> & ReadOnlyProps) {
  const locked = useLocked(readOnlySafe);
  return (
    <select
      className={cn(controlClasses, "h-9", className)}
      {...props}
      disabled={props.disabled || locked}
    />
  );
}

export function Checkbox({
  label,
  className,
  readOnlySafe,
  ...props
}: React.ComponentProps<"input"> & { label: string } & ReadOnlyProps) {
  // Hook first, || second: `props.disabled || useLocked(...)` would skip the
  // hook whenever the field is already disabled — a conditional hook call.
  const locked = useLocked(readOnlySafe);
  const disabled = props.disabled || locked;
  return (
    <label
      className={cn(
        "flex items-center gap-2 text-sm text-ink",
        disabled && "cursor-not-allowed text-ink-muted",
        className
      )}
    >
      <input
        type="checkbox"
        className="size-4 accent-primary"
        {...props}
        disabled={disabled}
      />
      {label}
    </label>
  );
}

/**
 * A choice tile (2026-09-08, Saša: the profession checkboxes were "not
 * styled nicely"): the multi-pick idiom for professions on the worker form
 * and the candidate sheet. The whole tile is the target, the tick sits in
 * a drawn box, and a picked tile turns primary-subtle so the selection
 * reads at a glance. Still a real checkbox underneath — name/value submit
 * exactly as before.
 */
export function CheckTile({
  label,
  hint,
  icon,
  className,
  readOnlySafe,
  ...props
}: React.ComponentProps<"input"> & {
  label: string;
  /** A muted second line — why the tile is fixed or what it depends on. */
  hint?: string;
  /** A glyph before the label (the quote inclusions carry their icons). */
  icon?: React.ReactNode;
} & ReadOnlyProps) {
  const locked = useLocked(readOnlySafe);
  const disabled = props.disabled || locked;
  const checked = Boolean(props.checked);
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer select-none items-center gap-2.5 rounded-control border px-3 py-2 text-sm text-ink transition-colors duration-150",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary",
        checked
          ? "border-primary bg-primary-subtle"
          : "border-border-strong bg-bg hover:bg-surface",
        disabled && "cursor-not-allowed text-ink-muted hover:bg-bg",
        className
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        {...props}
        disabled={disabled}
      />
      <span
        aria-hidden="true"
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors duration-150",
          checked
            ? "border-primary bg-primary text-white"
            : "border-border-strong bg-bg"
        )}
      >
        {checked && (
          <svg
            width="10"
            height="10"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m3 8.5 3 3 7-7" />
          </svg>
        )}
      </span>
      {icon && (
        <span
          aria-hidden="true"
          className={cn(
            "flex shrink-0 items-center",
            checked ? "text-primary" : "text-ink-muted"
          )}
        >
          {icon}
        </span>
      )}
      <span className="flex min-w-0 flex-col leading-snug">
        <span>{label}</span>
        {hint && <span className="text-micro text-ink-muted">{hint}</span>}
      </span>
    </label>
  );
}

/**
 * The file picker (2026-09-08): one kit control for every scan and
 * contract upload, so the browse button reads the same in a dialog, a
 * table row and the contract line. `accept` defaults to what the office
 * uploads — PDFs and photos.
 */
export function FileInput({
  className,
  readOnlySafe,
  ...props
}: React.ComponentProps<"input"> & ReadOnlyProps) {
  const locked = useLocked(readOnlySafe);
  return (
    <input
      type="file"
      accept="application/pdf,image/*"
      className={cn(
        "w-full rounded-control border border-border-strong bg-bg px-2 py-1.5 text-base text-ink-secondary lg:text-sm",
        "file:mr-3 file:rounded-control file:border file:border-border-strong file:bg-surface file:px-3 file:py-1 file:text-detail file:font-medium file:text-ink hover:file:bg-surface-raised",
        "outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:bg-surface disabled:text-ink-muted",
        className
      )}
      {...props}
      disabled={props.disabled || locked}
    />
  );
}

export function Textarea({
  className,
  readOnlySafe,
  ...props
}: React.ComponentProps<"textarea"> & ReadOnlyProps) {
  const locked = useLocked(readOnlySafe);
  return (
    <textarea
      className={cn(controlClasses, "min-h-24 py-2", className)}
      {...props}
      disabled={props.disabled || locked}
    />
  );
}

/**
 * A boolean that changes how the record reads — "never expires", "mobile
 * worksite" — drawn as a switch (2026-09-23, Saša: "custom selects,
 * toggles"). The whole row is the target and the state is readable without
 * the label: the track is primary when on. Underneath it is a
 * role="switch" button, so a form post carries the value only through the
 * optional hidden input `name`. A bare Checkbox stays for a multi-pick
 * beside its label; a Switch is for ONE boolean that flips the row.
 */
export function Switch({
  id,
  name,
  label,
  hint,
  checked,
  onChange,
  disabled: disabledProp,
  readOnlySafe,
  className,
}: {
  id?: string;
  name?: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
} & ReadOnlyProps) {
  const locked = useLocked(readOnlySafe);
  const disabled = disabledProp || locked;
  return (
    <div
      className={cn(
        "flex min-w-0 items-center justify-between gap-3",
        disabled && "text-ink-muted",
        className
      )}
    >
      <span className="flex min-w-0 flex-col leading-snug">
        <span id={id ? `${id}-label` : undefined} className="text-sm text-ink">
          {label}
        </span>
        {hint && <span className="text-micro text-ink-muted">{hint}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id ? `${id}-label` : undefined}
        aria-label={id ? undefined : label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full border transition-colors duration-150 outline-none",
          "focus-visible:ring-2 focus-visible:ring-primary/25",
          checked
            ? "border-primary bg-primary"
            : "border-border-strong bg-surface",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-0.5 left-0.5 size-[1.125rem] rounded-full bg-bg shadow-sm transition-transform duration-150",
            checked && "translate-x-4"
          )}
        />
      </button>
      {name && <input type="hidden" name={name} value={checked ? "on" : ""} />}
    </div>
  );
}
