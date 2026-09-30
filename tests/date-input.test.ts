// Ported from workforce-ops origin/main (cea4928) tests/domain/date-input.test.ts (spec §11.1); only the import paths changed.
import { describe, expect, it } from "vitest";
import {
  daysInMonth,
  expandYear,
  isoFromParts,
  isIsoDate,
  localTodayIso,
  maskTypedDate,
  monthGrid,
  parseTypedDate,
  shiftDayByMonths,
  shiftMonth,
  withinRange,
} from "../src/lib/date-input";

const TODAY = "2026-09-28";

describe("parseTypedDate", () => {
  it("reads the house format and its common variants, day first", () => {
    for (const s of ["28-09-2026", "28.09.2026", "28/9/2026", "28 9 2026", "28.9.26", "28092026", "280926", "2026-09-28"]) {
      expect(parseTypedDate(s, TODAY), s).toBe("2026-09-28");
    }
  });
  it("fills this year when only day and month are typed", () => {
    expect(parseTypedDate("3.10", TODAY)).toBe("2026-10-03");
    expect(parseTypedDate("0310", TODAY)).toBe("2026-10-03");
  });
  it("refuses days that do not exist and half-typed text", () => {
    for (const s of ["31-02-2026", "28-13-2026", "28-09-202", "abc", "28-0x-2026", "", "12345"]) {
      expect(parseTypedDate(s, TODAY), s).toBeNull();
    }
    expect(parseTypedDate("29-02-2028", TODAY)).toBe("2028-02-29");
    expect(parseTypedDate("29-02-2027", TODAY)).toBeNull();
  });
  it("reads a two-digit year as a birth year when it lies more than ten years ahead", () => {
    expect(expandYear(26, 2026)).toBe(2026);
    expect(expandYear(36, 2026)).toBe(2036);
    expect(expandYear(37, 2026)).toBe(1937);
    expect(parseTypedDate("14.5.85", TODAY)).toBe("1985-05-14");
  });
});

describe("maskTypedDate", () => {
  it("adds the dashes while digits are typed straight through", () => {
    let text = "";
    for (const ch of "28092026") text = maskTypedDate(text, text + ch);
    expect(text).toBe("28-09-2026");
  });
  it("keeps a dash the person typed and never re-adds one on delete", () => {
    expect(maskTypedDate("28", "28-")).toBe("28-");
    expect(maskTypedDate("28-0", "28-")).toBe("28-");
    expect(maskTypedDate("28-09-", "28-09")).toBe("28-09");
  });
  it("leaves a date the person separated themselves alone", () => {
    expect(maskTypedDate("1.9.202", "1.9.2026")).toBe("1.9.2026");
    expect(maskTypedDate("1-", "1-9")).toBe("1-9");
  });
});

describe("month grid", () => {
  it("starts on the Monday on or before the 1st and holds six weeks", () => {
    const grid = monthGrid(2026, 9); // 1 Sep 2026 is a Tuesday
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe("2026-08-31");
    expect(grid[1]).toBe("2026-09-01");
    expect(monthGrid(2026, 6)[0]).toBe("2026-06-01"); // a Monday
  });
  it("steps months across years and clips days", () => {
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftDayByMonths("2026-01-31", 1)).toBe("2026-02-28");
  });
  it("checks ranges and ISO", () => {
    expect(withinRange("2026-09-28", "2026-09-28", null)).toBe(true);
    expect(withinRange("2026-09-27", "2026-09-28", null)).toBe(false);
    expect(withinRange("2026-09-29", null, "2026-09-28")).toBe(false);
    expect(isIsoDate("2026-02-30")).toBe(false);
  });
});

describe("the rest of the module the DateInput reads", () => {
  // Run in two zones on opposite sides of UTC (Node honours a TZ change at run time): in the UTC
  // container the gates run in, a UTC-based implementation would pass a local-only assertion.
  it.each(["Pacific/Kiritimati", "Pacific/Pago_Pago", "Europe/Ljubljana"])(
    "today is the local calendar day, not the UTC one (TZ=%s)",
    (zone) => {
      const saved = process.env.TZ;
      process.env.TZ = zone;
      try {
        // The zone really applies: 12:00 local is not 12:00 UTC in any of these.
        expect(new Date(2026, 8, 30, 12).getUTCHours()).not.toBe(12);
        expect(localTodayIso(new Date(2026, 8, 30, 23, 30))).toBe("2026-09-30");
        expect(localTodayIso(new Date(2026, 0, 1, 0, 5))).toBe("2026-01-01");
        expect(localTodayIso(new Date(2026, 1, 28, 23, 59))).toBe("2026-02-28");
      } finally {
        if (saved === undefined) delete process.env.TZ;
        else process.env.TZ = saved;
      }
    },
  );
  it("month grid of a February that starts on a Monday", () => {
    const grid = monthGrid(2027, 2); // 1 Feb 2027 is a Monday
    expect(grid[0]).toBe("2027-02-01");
    expect(grid[27]).toBe("2027-02-28");
    expect(grid[28]).toBe("2027-03-01");
  });
  it("days and ISO parts", () => {
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(isoFromParts(2026, 9, 31)).toBeNull();
    expect(isoFromParts(2026, 9, 30)).toBe("2026-09-30");
    expect(isIsoDate("2026-09-30")).toBe(true);
    expect(isIsoDate("30-09-2026")).toBe(false);
  });
});
