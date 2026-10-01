// The validity of a dated paper (library 1.1.0, spec §12.4): Workforce Ops' `documentExpiryStatus`
// (domain/compliance.ts) with the warning window as a parameter, and its `daysBetween`
// (domain/operations.ts), copied verbatim. "due" is Workforce Ops' "expiring". React-free.

export type ValidityState = "valid" | "due" | "expired" | "unknown" | "no_expiry";

export type ValidityOptions = {
  /** The paper never expires: without a date it reads "no_expiry" instead of "unknown". */
  noExpiry?: boolean;
  /** How many days before the date the paper is "due". Default 30. */
  warnDays?: number;
};

/** Whole days from one ISO date to another (UTC-anchored, no DST surprises). */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round(
    (new Date(`${toIso}T00:00:00Z`).getTime() -
      new Date(`${fromIso}T00:00:00Z`).getTime()) /
      86_400_000
  );
}

/**
 * The state of a paper whose validity ends on `date` (ISO), seen on `today` (ISO). Without a date
 * it is "unknown", or "no_expiry" when the paper never expires; a date wins over `noExpiry`. The
 * date itself is still valid: "expired" starts the day after, "due" from `warnDays` days before.
 */
export function validityState(
  date: string | null,
  today: string,
  { noExpiry = false, warnDays = 30 }: ValidityOptions = {}
): ValidityState {
  if (!date) return noExpiry ? "no_expiry" : "unknown";
  if (date < today) return "expired";
  const warn = new Date(`${today}T00:00:00Z`);
  warn.setUTCDate(warn.getUTCDate() + warnDays);
  if (date <= warn.toISOString().slice(0, 10)) return "due";
  return "valid";
}
