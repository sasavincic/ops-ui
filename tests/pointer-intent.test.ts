// 1.5.0: ported from workforce-ops origin/main (96b4c7a) tests/lib/pointer-intent.test.ts; only the import path changed.
import { describe, expect, it } from "vitest";
import { pointerMoved } from "../src/lib/pointer-intent";

describe("pointerMoved", () => {
  it("ignores the first report — a list may have opened under a still cursor", () => {
    expect(pointerMoved(null, { x: 10, y: 10 })).toBe(false);
  });
  it("ignores a report at the same spot (content scrolled under the cursor)", () => {
    expect(pointerMoved({ x: 10, y: 10 }, { x: 10, y: 10 })).toBe(false);
  });
  it("follows a real move", () => {
    expect(pointerMoved({ x: 10, y: 10 }, { x: 11, y: 10 })).toBe(true);
  });
});
