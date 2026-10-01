"use client";

import { StatusIcon } from "./status-icon";
import { useOpsUi } from "../config/provider";
import { EN_OPTIONAL_STRINGS } from "../config/strings";
import { formatDate } from "../lib/dates";
import { fmt } from "../lib/fmt";
import { daysBetween, validityState } from "../lib/validity";
import { cn } from "../lib/cn";

// Library 1.1.0 (spec §12.4): Workforce Ops' src/components/ui/validity-cell.tsx, decoupled like
// the 1.0 components (§7): documentExpiryStatus → validityState (with `warnDays`, default 30),
// the dictionary words → strings.validity (English defaults = Workforce Ops' en words). With the
// default strings it renders exactly what Workforce Ops renders.

/**
 * Validity in one cell — the ONE rendering for a dated paper in a table
 * (2026-09-11 DocTable idiom, made app-wide by the status doctrine
 * 2026-09-25): the date, and a second line only when something is due —
 * red "expired N d ago", amber "in N d", amber "Validity unknown" when no
 * date. A valid paper shows its date and nothing else (the silent
 * default); a paper that never expires says so in words. Never a pill.
 *
 * `label` prefixes the note ("Confirmation: in 12 d") when a row carries
 * a second dated obligation.
 */
/** The due line alone — for a row whose date is already shown elsewhere
 * (a posting's period). Renders nothing while the paper is valid. */
export function ValidityNote({
  date,
  today,
  noExpiry = false,
  warnDays = 30,
  label,
  className,
}: {
  date: string | null;
  today: string;
  noExpiry?: boolean;
  /** Days before the date the paper is due; default 30. */
  warnDays?: number;
  label?: string;
  className?: string;
}) {
  const v = useValidity(date, today, noExpiry, warnDays);
  if (!v.note) return null;
  return (
    <span className={cn("flex items-center gap-1 whitespace-nowrap text-detail", v.tone, className)}>
      <StatusIcon name={v.glyph} />
      {label ? `${label}: ${v.note}` : v.note}
    </span>
  );
}

function useValidity(date: string | null, today: string, noExpiry: boolean, warnDays: number) {
  const { strings } = useOpsUi();
  const words = strings.validity ?? EN_OPTIONAL_STRINGS.validity;
  const status = validityState(date, today, { noExpiry, warnDays });
  const tone =
    status === "expired" ? "text-danger" : status === "due" || status === "unknown" ? "text-warning" : null;
  const days = date ? Math.abs(daysBetween(today, date)) : 0;
  const note =
    status === "expired"
      ? fmt(words.expiredAgo, { days })
      : status === "due"
        ? fmt(words.expiresIn, { days })
        : status === "unknown"
          ? words.unknown
          : null;
  const glyph = status === "expired" ? ("problem" as const) : status === "due" ? ("clock" as const) : ("question" as const);
  return { words, status, tone, note, glyph };
}

export function ValidityCell({
  date,
  today,
  noExpiry = false,
  warnDays = 30,
  label,
  className,
}: {
  date: string | null;
  today: string;
  noExpiry?: boolean;
  /** Days before the date the paper is due; default 30. */
  warnDays?: number;
  label?: string;
  className?: string;
}) {
  const { words, status, tone, note, glyph } = useValidity(date, today, noExpiry, warnDays);
  const labelled = (text: string) => (label ? `${label}: ${text}` : text);
  // No date at all: the note IS the line (no dash above it).
  if (!date && note) {
    return (
      <span className={cn("flex items-center gap-1 whitespace-nowrap", tone, className)}>
        <StatusIcon name={glyph} />
        {labelled(note)}
      </span>
    );
  }
  return (
    <span className={cn("flex flex-col", className)}>
      <span className={cn("whitespace-nowrap", tone ?? "text-ink")}>
        {label && !note ? `${label}: ` : null}
        {date ? formatDate(date) : status === "no_expiry" ? words.noExpiry : "—"}
      </span>
      {note && (
        <span className={cn("flex items-center gap-1 whitespace-nowrap text-detail", tone)}>
          <StatusIcon name={glyph} />
          {labelled(note)}
        </span>
      )}
    </span>
  );
}
