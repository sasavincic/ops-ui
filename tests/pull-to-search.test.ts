// 1.5.0: ported from workforce-ops origin/main (96b4c7a) tests/lib/pull-to-search.test.ts; only the import path changed.
import { describe, expect, it } from "vitest";
import {
  PULL_MAX_OFFSET,
  PULL_TRIGGER_TRAVEL,
  isPullArmed,
  pullIntent,
  pullOffset,
  pullProgress,
} from "../src/lib/pull-to-search";

describe("pull-to-search feel", () => {
  it("needs an exaggerated pull before it arms — a scroll bounce never opens search", () => {
    expect(isPullArmed(40)).toBe(false);
    expect(isPullArmed(PULL_TRIGGER_TRAVEL - 1)).toBe(false);
    expect(isPullArmed(PULL_TRIGGER_TRAVEL)).toBe(true);
    expect(PULL_TRIGGER_TRAVEL).toBeGreaterThanOrEqual(120);
  });

  it("moves the content with resistance, monotonically, and never past the cap", () => {
    expect(pullOffset(-30)).toBe(0);
    expect(pullOffset(0)).toBe(0);
    let last = 0;
    for (let travel = 5; travel <= 600; travel += 5) {
      const offset = pullOffset(travel);
      expect(offset).toBeGreaterThanOrEqual(last);
      expect(offset).toBeLessThan(travel);
      expect(offset).toBeLessThanOrEqual(PULL_MAX_OFFSET);
      last = offset;
    }
    expect(pullOffset(600)).toBeGreaterThan(pullOffset(PULL_TRIGGER_TRAVEL) * 0.9);
  });

  it("reports progress 0→1 across the arming distance", () => {
    expect(pullProgress(0)).toBe(0);
    expect(pullProgress(PULL_TRIGGER_TRAVEL / 2)).toBeCloseTo(0.5);
    expect(pullProgress(PULL_TRIGGER_TRAVEL * 3)).toBe(1);
  });

  it("decides direction early: sideways is not a pull, a short wobble is undecided", () => {
    expect(pullIntent(3, 4)).toBe("undecided");
    expect(pullIntent(30, 12)).toBe("not_a_pull");
    expect(pullIntent(4, 24)).toBe("pull");
    expect(pullIntent(0, -20)).toBe("not_a_pull");
  });
});
