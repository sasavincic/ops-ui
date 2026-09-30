/**
 * The house date input (2026-09-28, Saša: "we shouldn't rely on the
 * browser but have our own"). The field shows and takes DD-MM-YYYY — the
 * format every screen renders (domain/dates formatDate) — and hands back
 * ISO, exactly what the native input used to post. Pure rules here; the
 * component lives in components/ui/date-input.tsx.
 */

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real calendar day as ISO, or null (31-02 is not a day). */
export function isoFromParts(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1) return null;
  if (day > daysInMonth(year, month)) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function isIsoDate(value: string): boolean {
  const m = ISO.exec(value);
  return !!m && isoFromParts(Number(m[1]), Number(m[2]), Number(m[3])) === value;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * A two-digit year: up to ten years ahead of today reads as this century,
 * the rest as the last — "26" is 2026, "85" (a birth date) is 1985.
 */
export function expandYear(two: number, todayYear: number): number {
  const century = Math.floor(todayYear / 100) * 100;
  return two <= (todayYear % 100) + 10 ? century + two : century - 100 + two;
}

/**
 * What a person typed, read leniently: "28-09-2026", "28.9.2026",
 * "28/9/26", "28 9 2026", "28092026", "280926", "28.9" (this year) and a
 * pasted ISO "2026-09-28". Day first, always — the office is European.
 */
export function parseTypedDate(text: string, todayIso: string): string | null {
  const s = text.trim();
  if (!s) return null;
  const todayYear = Number(todayIso.slice(0, 4));
  if (ISO.test(s)) return isIsoDate(s) ? s : null;
  const year = (y: string) => (y.length === 2 ? expandYear(Number(y), todayYear) : Number(y));
  if (/^\d+$/.test(s)) {
    if (s.length === 8) return isoFromParts(Number(s.slice(4)), Number(s.slice(2, 4)), Number(s.slice(0, 2)));
    if (s.length === 6) return isoFromParts(year(s.slice(4)), Number(s.slice(2, 4)), Number(s.slice(0, 2)));
    if (s.length === 4) return isoFromParts(todayYear, Number(s.slice(2)), Number(s.slice(0, 2)));
    return null;
  }
  const parts = s.split(/[\s./-]+/).filter(Boolean);
  if (parts.some((p) => !/^\d+$/.test(p))) return null;
  if (parts.length === 2 && parts.every((p) => p.length <= 2)) {
    return isoFromParts(todayYear, Number(parts[1]), Number(parts[0]));
  }
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  if (d.length > 2 || m.length > 2 || (y.length !== 2 && y.length !== 4)) return null;
  return isoFromParts(year(y), Number(m), Number(d));
}

/**
 * The typing mask: digits typed straight through gain their dashes
 * ("2809" → "28-09", "28092026" → "28-09-2026"), so a phone's number pad
 * is enough. Anything the person separated themselves ("1.9.2026",
 * "1-9") is left alone, and deleting never re-inserts a dash.
 */
export function maskTypedDate(previous: string, next: string): string {
  if (next.length <= previous.length) return next;
  const dashesOnlyWhereMaskPutsThem = [...next].every((ch, i) =>
    ch === "-" ? i === 2 || i === 5 : /\d/.test(ch)
  );
  if (!dashesOnlyWhereMaskPutsThem) return next;
  // A dash appears once the group before it is complete AND the next digit
  // arrives ("28" stays "28", "280" becomes "28-0"), or when typed there.
  const digits = next.replace(/-/g, "").slice(0, 8);
  let out = digits.slice(0, 2);
  if (digits.length > 2) out += `-${digits.slice(2, 4)}`;
  if (digits.length > 4) out += `-${digits.slice(4)}`;
  if (next.endsWith("-") && (digits.length === 2 || digits.length === 4)) out += "-";
  return out;
}

/** Inside [min, max] (either may be empty). */
export function withinRange(iso: string, min?: string | null, max?: string | null): boolean {
  return !(min && iso < min) && !(max && iso > max);
}

/**
 * The six weeks shown for a month, Monday first (the office's week):
 * 42 ISO days starting on the Monday on or before the 1st.
 */
export function monthGrid(year: number, month: number): string[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7; // Mon 0 … Sun 6
  const start = Date.UTC(year, month - 1, 1 - offset);
  return Array.from({ length: 42 }, (_, i) =>
    new Date(start + i * 86_400_000).toISOString().slice(0, 10)
  );
}

/** Month arithmetic on a { year, month } view. */
export function shiftMonth(view: { year: number; month: number }, delta: number) {
  const index = view.year * 12 + (view.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** The same day in another month, clipped to that month's length. */
export function shiftDayByMonths(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const view = shiftMonth({ year: y, month: m }, delta);
  return isoFromParts(view.year, view.month, Math.min(d, daysInMonth(view.year, view.month)))!;
}

/** Today in the browser's own calendar (never UTC — at 00:30 it is today). */
export function localTodayIso(now: Date = new Date()): string {
  return isoFromParts(now.getFullYear(), now.getMonth() + 1, now.getDate())!;
}
