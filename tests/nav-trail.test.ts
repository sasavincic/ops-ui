// Ported from workforce-ops origin/main (cea4928) tests/domain/nav-trail.test.ts (spec §11.1); only the import paths changed.
import { describe, expect, it } from "vitest";
import {
  backTarget, startTrail, navigateTrail, parseTrail, MAX_TRAIL_ENTRIES,
} from "../src/navigation/trail";

function walk(...urls: string[]) {
  return urls.slice(1).reduce((trail, url) => navigateTrail(trail, url, "push"), startTrail(urls[0]));
}

describe("navigation tied to browser entries", () => {
  it("uses a real history traversal even when the destination is the fallback list", () => {
    const trail = walk("/workers", "/workers/a");
    expect(backTarget(trail, "/workers/a", "/workers")).toEqual({ url: "/workers", delta: -1 });
  });
  it("returns to the exact source tab and filters", () => {
    const trail = walk("/operations?view=board&worksite=b", "/workers/a?tab=work");
    expect(backTarget(trail, "/workers/a", "/workers")).toEqual({ url: "/operations?view=board&worksite=b", delta: -1 });
  });
  it("does not count replaced tabs or filters as page visits", () => {
    let trail = walk("/operations", "/workers/a");
    trail = navigateTrail(trail, "/workers/a?tab=documents", "replace");
    trail = navigateTrail(trail, "/workers/a?tab=work", "replace");
    expect(backTarget(trail, "/workers/a", "/workers")).toEqual({ url: "/operations", delta: -1 });
  });
  it("skips query-only pushes by their actual distance", () => {
    const trail = walk("/operations", "/workers/a", "/workers/a?tab=work", "/workers/a?tab=documents");
    expect(backTarget(trail, "/workers/a", "/workers")).toEqual({ url: "/operations", delta: -3 });
  });
  it("keeps deliberate forward revisits and resolves each by its entry", () => {
    const trail = walk("/workers", "/workers/a?tab=work", "/worksites/b", "/workers/a?tab=documents");
    expect(backTarget(trail, "/workers/a", "/workers")).toEqual({ url: "/worksites/b", delta: -1 });
  });
  it("does not return to a saved editor or duplicate record after replacement", () => {
    let trail = walk("/workers?q=aldin", "/workers/a?tab=work", "/workers/a/edit");
    trail = navigateTrail(trail, "/workers/a", "replace");
    expect(backTarget(trail, "/workers/a", "/workers")).toEqual({ url: "/workers?q=aldin", delta: -2 });
  });
  it("new records return to their source rather than the submitted form", () => {
    let trail = walk("/workers?status=available", "/workers/new");
    trail = navigateTrail(trail, "/workers/a", "replace");
    expect(backTarget(trail, "/workers/a", "/workers")).toEqual({ url: "/workers?status=available", delta: -1 });
  });
  it("uses a replace fallback on fresh or untracked entries", () => {
    expect(backTarget(null, "/workers/a", "/workers")).toEqual({ url: "/workers", delta: null });
    expect(backTarget(startTrail("/workers/a"), "/workers/a", "/workers")).toEqual({ url: "/workers", delta: null });
  });
  it("ignores a snapshot for another active page during a route transition", () => {
    expect(backTarget(walk("/workers", "/workers/a"), "/worksites/b", "/worksites")).toEqual({ url: "/worksites", delta: null });
  });
  it("caps memory without changing history distances or mutating old snapshots", () => {
    const first = startTrail("/workers");
    let trail = first;
    for (let i = 0; i < MAX_TRAIL_ENTRIES + 10; i++) trail = navigateTrail(trail, `/workers/${i}`, "push");
    expect(trail.entries).toHaveLength(MAX_TRAIL_ENTRIES);
    expect(trail.index).toBe(MAX_TRAIL_ENTRIES + 10);
    expect(first).toEqual(startTrail("/workers"));
    expect(backTarget(trail, `/workers/${MAX_TRAIL_ENTRIES + 9}`, "/workers").delta).toBe(-1);
  });
});

describe("history state validation", () => {
  it("accepts a valid snapshot only at its own URL", () => {
    const trail = walk("/workers", "/workers/a?tab=work");
    expect(parseTrail(trail, "/workers/a?tab=work")).toEqual(trail);
    expect(parseTrail(trail, "/worksites/b")).toBeNull();
  });
  it.each([null, [], {}, { version: 1, entries: [] }, { version: 1, index: 0, entries: [{path:"/workers",url:"javascript:alert(1)",index:0}] }])("rejects malformed or legacy state: %j", (value) => {
    expect(parseTrail(value, "/workers")).toBeNull();
  });
  it.each(["//evil.test/workers", "/\\evil.test/workers", "https://evil.test/workers"])('rejects non-local targets %s', (url) => {
    const trail = walk("/workers", "/workers/a");
    trail.entries[0].url = url;
    expect(parseTrail(trail, "/workers/a")).toBeNull();
  });
  it("rejects impossible history positions", () => {
    const trail = walk("/workers", "/workers/a");
    trail.entries[0].index = 8;
    expect(parseTrail(trail, "/workers/a")).toBeNull();
  });
});
