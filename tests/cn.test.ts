import { describe, expect, it } from "vitest";
import { cn } from "../src/lib/cn";

// The one tailwind-merge config (spec §7, §11.1, risk 4): text-detail and
// text-micro are font sizes, so they must never delete a text colour.
describe("cn", () => {
  it("keeps a colour next to the kit's own font sizes", () => {
    expect(cn("text-white text-detail")).toBe("text-white text-detail");
    expect(cn("bg-primary text-white", "h-8 px-3 text-detail")).toBe("bg-primary text-white h-8 px-3 text-detail");
    expect(cn("text-ink-muted text-micro")).toBe("text-ink-muted text-micro");
  });

  it("still merges within a group: the later size wins, the later colour wins", () => {
    expect(cn("text-sm text-detail")).toBe("text-detail");
    expect(cn("text-detail text-micro")).toBe("text-micro");
    expect(cn("text-ink text-danger")).toBe("text-danger");
    expect(cn("px-3", "px-2")).toBe("px-2");
  });

  it("takes clsx inputs", () => {
    expect(cn("a", false, null, undefined, ["b", { c: true, d: false }])).toBe("a b c");
  });
});
