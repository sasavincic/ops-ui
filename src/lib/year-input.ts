/**
 * The year input's rules (1.4.0; PrefabOps restyle plan G13): a manufacture year, a year of
 * construction. The field takes four digits (or two, read as DateInput reads a two-digit year) and
 * hands back the four-digit string; the picker shows a page of twelve years, three to a row, the
 * same page DateInput's calendar shows when its title steps up to years. Pure; the component is
 * components/year-input.tsx.
 */
import { expandYear } from "./date-input";

/** A four-digit year as a string ("2026"), the value the field posts. */
export function isYearString(value: string): boolean {
  return /^\d{4}$/.test(value) && Number(value) >= 1000;
}

/**
 * What a person typed, read: four digits are that year; two digits are read like DateInput's
 * two-digit years (up to ten years ahead of today in this century, else the last one: "26" is
 * 2026, "85" is 1985). Anything else is null.
 */
export function parseTypedYear(text: string, todayYear: number): number | null {
  const s = text.trim();
  if (/^\d{4}$/.test(s)) {
    const year = Number(s);
    return year >= 1000 ? year : null;
  }
  if (/^\d{2}$/.test(s)) return expandYear(Number(s), todayYear);
  return null;
}

/** The typing filter: digits only, at most four (a pasted "2026." keeps its year). */
export function maskTypedYear(text: string): string {
  return text.replace(/\D/g, "").slice(0, 4);
}

/** Inside [min, max] (either may be absent). */
export function yearWithin(year: number, min?: number | null, max?: number | null): boolean {
  return !(min != null && year < min) && !(max != null && year > max);
}

/** The first year of the twelve-year page holding `year` (DateInput's page: 2016 – 2027). */
export function yearPageStart(year: number): number {
  return year - (((year % 12) + 12) % 12);
}

/**
 * The year the picker opens on: the field's year, else this year moved inside [min, max].
 */
export function anchorYear(value: number | null, todayYear: number, min?: number | null, max?: number | null): number {
  if (value !== null) return value;
  if (min != null && todayYear < min) return min;
  if (max != null && todayYear > max) return max;
  return todayYear;
}

/**
 * The keyboard walk in the grid (three to a row): ← → one year, ↑ ↓ one row (three years),
 * PageUp / PageDown a page (twelve), Shift + PageUp / PageDown ten pages, Home / End the first /
 * last year of the page. Null for any other key.
 */
export function yearKeyTarget(key: string, focused: number, shift = false): number | null {
  const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 };
  if (key in step) return focused + step[key];
  if (key === "PageUp" || key === "PageDown") return focused + (key === "PageUp" ? -12 : 12) * (shift ? 10 : 1);
  if (key === "Home") return yearPageStart(focused);
  if (key === "End") return yearPageStart(focused) + 11;
  return null;
}
