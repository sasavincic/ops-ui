// Ported from workforce-ops origin/main (cea4928) tests/lib/navigation-history.test.ts (spec §11.1); only the import paths changed.
import { describe, expect, it } from "vitest";
import { backTarget, type NavTrailState } from "../src/navigation/trail";
import { NAVIGATION_STATE_KEY, trackNavigation, type NavigationBrowser } from "../src/navigation/history";

/** History behaves like the browser: push truncates forward, replace does not. */
function browserAt(path: string) {
  const events = new EventTarget();
  const entries = [{ url: new URL(path, "https://app.test"), state: { __NA: true, tree: "keep me" } as Record<string, unknown> }];
  let cursor = 0;
  const browser = {
    get location() { return entries[cursor].url; },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    history: {
      get state() { return entries[cursor].state; },
      get length() { return entries.length; },
      pushState(state: unknown, _unused: string, url?: string | URL | null) {
        const destination = new URL(url == null ? entries[cursor].url.href : url, entries[cursor].url);
        if (destination.origin !== "https://app.test") throw new Error("cross-origin");
        entries.splice(cursor + 1);
        entries.push({ url: destination, state: structuredClone(state) as Record<string, unknown> });
        cursor++;
      },
      replaceState(state: unknown, _unused: string, url?: string | URL | null) {
        const destination = new URL(url == null ? entries[cursor].url.href : url, entries[cursor].url);
        if (destination.origin !== "https://app.test") throw new Error("cross-origin");
        entries[cursor] = { url: destination, state: structuredClone(state) as Record<string, unknown> };
      },
      go(delta: number) {
        if (cursor + delta < 0 || cursor + delta >= entries.length) return;
        cursor += delta;
        events.dispatchEvent(new Event("popstate"));
      },
    },
  };
  let snapshot: NavTrailState | null = null;
  const start = () => trackNavigation(browser as unknown as NavigationBrowser, (next) => { snapshot = next; });
  const stop = start();
  return { browser, start, stop, snapshot: () => snapshot };
}

function appBack(test: ReturnType<typeof browserAt>, fallback = "/workers") {
  const { browser } = test;
  const target = backTarget(test.snapshot(), browser.location.pathname, fallback);
  if (target.delta !== null) browser.history.go(target.delta);
  else browser.history.replaceState({}, "", target.url);
}

// These exercise real push/replace/traverse behavior. A path-only stack can
// pass reducer tests while the app arrow still grows native browser history.
describe("app and browser returns share one history", () => {
  it("unwinds record visits without adding history, even back to the default list", () => {
    const test = browserAt("/workers");
    const { browser } = test;
    browser.history.pushState({ __NA: true }, "", "/workers/a");
    browser.history.pushState({ __NA: true }, "", "/worksites/b");
    appBack(test);
    expect(browser.location.pathname).toBe("/workers/a");
    appBack(test);
    expect(browser.location.pathname).toBe("/workers");
    expect(browser.history.length).toBe(3);
    // Forward remains meaningful, proving Back really traversed the entries.
    browser.history.go(1);
    expect(browser.location.pathname).toBe("/workers/a");
    expect(backTarget(test.snapshot(), "/workers/a", "/workers").delta).toBe(-1);
    test.stop();
  });
  it("alternates browser Back and the app arrow without bouncing forward", () => {
    const test = browserAt("/operations?view=board");
    const { browser } = test;
    browser.history.pushState({}, "", "/workers/a");
    browser.history.pushState({}, "", "/worksites/b");
    appBack(test);
    browser.history.go(-1);
    expect(browser.location.pathname).toBe("/operations");
    expect(browser.location.search).toBe("?view=board");
    expect(browser.history.length).toBe(3);
  });
  it("handles repeat visits, browser forward, reload and a new branch", () => {
    const test = browserAt("/workers");
    const { browser } = test;
    browser.history.pushState({}, "", "/workers/a?tab=work");
    browser.history.pushState({}, "", "/worksites/b");
    browser.history.pushState({}, "", "/workers/a?tab=documents");
    appBack(test);
    expect(browser.location.pathname).toBe("/worksites/b");
    browser.history.go(1);
    test.stop();
    const stopAgain = test.start(); // history.state survives a reload/remount
    appBack(test);
    expect(browser.location.pathname).toBe("/worksites/b");
    appBack(test);
    expect(browser.location.search).toBe("?tab=work");
    browser.history.pushState({}, "", "/workers/c");
    appBack(test);
    expect(browser.location.pathname + browser.location.search).toBe("/workers/a?tab=work");
    stopAgain();
  });
  it("replaces successful form submissions and never returns to the saved editor", () => {
    const test = browserAt("/workers?q=aldin");
    const { browser } = test;
    browser.history.pushState({}, "", "/workers/a");
    browser.history.pushState({}, "", "/workers/a/edit");
    browser.history.replaceState({}, "", "/workers/a");
    appBack(test);
    expect(browser.location.pathname + browser.location.search).toBe("/workers?q=aldin");
    expect(browser.history.length).toBe(3);
  });
  it("has no dependency on sessionStorage and preserves router-owned state", () => {
    const test = browserAt("/workers");
    expect(test.browser.history.state.tree).toBe("keep me");
    const routerState = { __NA: true, tree: { page: "worker" } };
    test.browser.history.pushState(routerState, "", "/workers/a");
    expect(test.browser.history.state.tree).toEqual({ page: "worker" });
    expect(routerState).not.toHaveProperty(NAVIGATION_STATE_KEY);
    expect(test.browser.history.state).toHaveProperty(NAVIGATION_STATE_KEY);
  });
  it("ignores legacy or foreign state rather than leaving the app on Back", () => {
    const test = browserAt("/workers/a");
    appBack(test);
    expect(test.browser.location.pathname).toBe("/workers");
    expect(test.browser.history.length).toBe(1);
  });
  it("does not publish a successful navigation if the browser rejects it", () => {
    const test = browserAt("/workers");
    const before = test.snapshot();
    expect(() => test.browser.history.pushState({}, "", "https://elsewhere.test")).toThrow("cross-origin");
    expect(test.snapshot()).toBe(before);
  });
  it("survives a router wrapping History after us and StrictMode cleanup", () => {
    const test = browserAt("/workers");
    const { browser } = test;
    const wrappedPush = browser.history.pushState;
    browser.history.pushState = (...args) => wrappedPush(...args);
    test.stop();
    const stopAgain = test.start();
    browser.history.pushState({}, "", "/workers/a");
    expect(test.snapshot()?.index).toBe(1);
    appBack(test);
    expect(browser.location.pathname).toBe("/workers");
    stopAgain();
  });
});
