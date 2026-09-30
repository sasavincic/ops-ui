import { navigateTrail, parseTrail, startTrail, type NavTrailState } from "@/domain/nav-trail";

export const NAVIGATION_STATE_KEY = "__workforceNavigation";

/** Minimal browser surface, also exercised with a real history model in tests. */
export type NavigationBrowser = Pick<Window, "history" | "location" | "addEventListener" | "removeEventListener">;

/**
 * Observe the public History API without changing push/replace semantics or
 * Next's private state. Each entry carries its own return trail, so browser
 * Back/Forward, reloads and the app arrow all agree, including repeat visits.
 */
export function trackNavigation(browser: NavigationBrowser, publish: (state: NavTrailState | null) => void) {
  const history = browser.history;
  const originalPush = history.pushState;
  const originalReplace = history.replaceState;
  let active = true;
  const currentUrl = () => browser.location.pathname + browser.location.search + browser.location.hash;
  const restore = () => parseTrail(history.state?.[NAVIGATION_STATE_KEY], currentUrl());
  let state = restore() ?? startTrail(currentUrl());
  const withTrail = (data: unknown, next: NavTrailState) => ({
    ...(data && typeof data === "object" ? data : {}),
    [NAVIGATION_STATE_KEY]: next,
  });

  // Keep existing router state, including its tree and scroll information.
  originalReplace.call(history, withTrail(history.state, state), "", browser.location.href);
  publish(state);

  function record(mode: "push" | "replace", data: unknown, unused: string, url?: string | URL | null) {
    const method = mode === "push" ? originalPush : originalReplace;
    if (!active) return method.call(history, data, unused, url);
    const destination = new URL(url == null ? browser.location.href : String(url), browser.location.href);
    // Let the browser enforce same-origin and serialization restrictions.
    if (destination.origin !== browser.location.origin) return method.call(history, data, unused, url);
    const next = navigateTrail(state, destination.pathname + destination.search + destination.hash, mode);
    method.call(history, withTrail(data, next), unused, url);
    state = next;
    publish(state);
  }
  const push: History["pushState"] = (data, unused, url) => record("push", data, unused, url);
  const replace: History["replaceState"] = (data, unused, url) => record("replace", data, unused, url);
  history.pushState = push;
  history.replaceState = replace;

  const onPop = () => {
    state = restore() ?? startTrail(currentUrl());
    // An unknown entry starts a new boundary; never traverse into an
    // unrelated/older session just because the browser has history.
    if (!restore()) originalReplace.call(history, withTrail(history.state, state), "", browser.location.href);
    publish(state);
  };
  browser.addEventListener("popstate", onPop);
  return () => {
    active = false;
    browser.removeEventListener("popstate", onPop);
    // Next may have wrapped us afterwards. An inactive inner wrapper is a
    // pass-through; never replace a newer wrapper during StrictMode/HMR.
    if (history.pushState === push) history.pushState = originalPush;
    if (history.replaceState === replace) history.replaceState = originalReplace;
    publish(null);
  };
}
