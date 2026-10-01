import { describe, expect, it } from "vitest";
import { daysBetween, validityState } from "../src/lib/validity";
import { shiftDay } from "../src/lib/dates";

// lib/validity.ts (library 1.1.0, spec §12.4): Workforce Ops' documentExpiryStatus with the
// warning window as a parameter ("expiring" is "due").

const TODAY = "2026-10-01";

/** Workforce Ops' documentExpiryStatus + expiryStatus (domain/compliance.ts at 23d7d5c), verbatim
 * but for the window, which was the constant EXPIRY_WARNING_DAYS = 30. */
function wfoDocumentExpiryStatus(expiryDate: string | null, today: string, noExpiry = false, warnDays = 30) {
  return !expiryDate && !noExpiry ? "unknown" : wfoExpiryStatus(expiryDate, today, warnDays);
}
function wfoExpiryStatus(expiryDate: string | null, today: string, warnDays: number) {
  if (!expiryDate) return "no_expiry";
  if (expiryDate < today) return "expired";
  const warn = new Date(`${today}T00:00:00Z`);
  warn.setUTCDate(warn.getUTCDate() + warnDays);
  if (expiryDate <= warn.toISOString().slice(0, 10)) return "expiring";
  return "valid";
}

describe("validityState", () => {
  it("the boundaries of the default 30-day window", () => {
    expect(validityState(shiftDay(TODAY, -1), TODAY)).toBe("expired");
    expect(validityState(TODAY, TODAY)).toBe("due"); // the date itself is still valid
    expect(validityState(shiftDay(TODAY, 30), TODAY)).toBe("due");
    expect(validityState(shiftDay(TODAY, 31), TODAY)).toBe("valid");
  });

  it("no date: unknown, or no_expiry when the paper never expires; a date wins over noExpiry", () => {
    expect(validityState(null, TODAY)).toBe("unknown");
    expect(validityState(null, TODAY, { noExpiry: true })).toBe("no_expiry");
    expect(validityState(null, TODAY, { noExpiry: false })).toBe("unknown");
    expect(validityState(shiftDay(TODAY, -3), TODAY, { noExpiry: true })).toBe("expired");
    expect(validityState(shiftDay(TODAY, 3), TODAY, { noExpiry: true })).toBe("due");
  });

  it("warnDays moves the window (0 = due only on the day itself)", () => {
    expect(validityState(shiftDay(TODAY, 60), TODAY, { warnDays: 60 })).toBe("due");
    expect(validityState(shiftDay(TODAY, 61), TODAY, { warnDays: 60 })).toBe("valid");
    expect(validityState(TODAY, TODAY, { warnDays: 0 })).toBe("due");
    expect(validityState(shiftDay(TODAY, 1), TODAY, { warnDays: 0 })).toBe("valid");
    expect(validityState(shiftDay(TODAY, -1), TODAY, { warnDays: 0 })).toBe("expired");
  });

  it("across month and year ends and a leap day", () => {
    expect(validityState("2028-03-30", "2028-02-29")).toBe("due");
    expect(validityState("2028-03-31", "2028-02-29")).toBe("valid");
    expect(validityState("2027-01-30", "2026-12-31")).toBe("due");
    expect(validityState("2027-01-31", "2026-12-31")).toBe("valid");
  });

  it("equals Workforce Ops' documentExpiryStatus over -400…+400 days, null and noExpiry (spec §12.4 parity)", () => {
    const map = { expiring: "due" } as Record<string, string>;
    for (const warnDays of [30, 0, 60]) {
      for (const noExpiry of [false, true]) {
        for (let d = -400; d <= 400; d++) {
          const date = shiftDay(TODAY, d);
          const wfo = wfoDocumentExpiryStatus(date, TODAY, noExpiry, warnDays);
          expect(validityState(date, TODAY, { noExpiry, warnDays }), `${date} ${noExpiry} ${warnDays}`).toBe(map[wfo] ?? wfo);
        }
        const wfo = wfoDocumentExpiryStatus(null, TODAY, noExpiry, warnDays);
        expect(validityState(null, TODAY, { noExpiry, warnDays })).toBe(map[wfo] ?? wfo);
      }
    }
  });
});

describe("daysBetween", () => {
  it("whole days, signed, UTC-anchored", () => {
    expect(daysBetween(TODAY, TODAY)).toBe(0);
    expect(daysBetween(TODAY, "2026-10-31")).toBe(30);
    expect(daysBetween("2026-10-31", TODAY)).toBe(-30);
    // A DST change in Europe (2026-10-25) does not make a 23- or 25-hour day count differently.
    expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2);
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
  });
});
