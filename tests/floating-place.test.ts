import { describe, expect, it } from "vitest";
import { floatingTop } from "../src/lib/floating-place";

describe("floatingTop", () => {
  it("opens below when it fits", () => {
    expect(floatingTop({ top: 100, bottom: 140 }, 300, 800)).toEqual({ top: 144, maxHeight: null });
  });

  it("opens above when only above fits", () => {
    expect(floatingTop({ top: 600, bottom: 640 }, 300, 800)).toEqual({ top: 296, maxHeight: null });
  });

  // The phone case: a field mid-screen, room on neither side — the panel
  // stays whole on screen (its footer reachable), covering the field.
  it("stays on screen when neither side fits", () => {
    const place = floatingTop({ top: 400, bottom: 450 }, 420, 844);
    expect(place).toEqual({ top: 416, maxHeight: null });
    expect(place.top + 420).toBeLessThanOrEqual(844 - 8);
  });

  it("scrolls a panel taller than the screen", () => {
    expect(floatingTop({ top: 100, bottom: 140 }, 700, 500)).toEqual({ top: 8, maxHeight: 484 });
  });
});
