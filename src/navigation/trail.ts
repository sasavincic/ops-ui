/**
 * A small, immutable snapshot attached to each real browser-history entry.
 * Entry positions, not matching pathnames, distinguish repeat visits. Back
 * traverses that history instead of creating a second, conflicting history.
 */
export type TrailEntry = { path: string; url: string; index: number };
export type NavTrailState = { version: 1; index: number; entries: TrailEntry[] };
export type BackDestination = { url: string; delta: number | null };
export const MAX_TRAIL_ENTRIES = 25;

function pathOf(url: string): string {
  return new URL(url, "https://app.invalid").pathname;
}

function isLocalUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/") &&
    !value.startsWith("//") && !/[\\\u0000-\u001f\u007f]/.test(value);
}

/** Ignore stale/foreign state instead of guessing a return destination. */
export function parseTrail(value: unknown, url: string): NavTrailState | null {
  if (!value || typeof value !== "object") return null;
  const state = value as NavTrailState;
  if (state.version !== 1 || !Number.isSafeInteger(state.index) || state.index < 0 ||
      !Array.isArray(state.entries) || !state.entries.length || state.entries.length > MAX_TRAIL_ENTRIES) return null;
  let previous = -1;
  for (const entry of state.entries) {
    if (!entry || !isLocalUrl(entry.url) || entry.path !== pathOf(entry.url) ||
        !Number.isSafeInteger(entry.index) || entry.index <= previous || entry.index > state.index) return null;
    previous = entry.index;
  }
  const last = state.entries.at(-1)!;
  return last.index === state.index && last.url === url ? state : null;
}

export function startTrail(url: string): NavTrailState {
  return { version: 1, index: 0, entries: [{ path: pathOf(url), url, index: 0 }] };
}

export function navigateTrail(state: NavTrailState, url: string, mode: "push" | "replace"): NavTrailState {
  const index = state.index + (mode === "push" ? 1 : 0);
  const path = pathOf(url);
  const entries = mode === "replace" ? state.entries.slice(0, -1) : [...state.entries];
  // Tabs are one stop. Replacing a completed editor with its record also
  // removes the duplicate record from the logical trail, while its real
  // browser position stays accurate for history.go().
  if (entries.at(-1)?.path === path) entries.pop();
  entries.push({ path, url, index });
  return { version: 1, index, entries: entries.slice(-MAX_TRAIL_ENTRIES) };
}

export function backTarget(state: NavTrailState | null, path: string, fallback: string): BackDestination {
  if (state?.entries.at(-1)?.path === path) {
    for (let i = state.entries.length - 2; i >= 0; i--) {
      const entry = state.entries[i];
      if (entry.path !== path) return { url: entry.url, delta: entry.index - state.index };
    }
  }
  return { url: fallback, delta: null };
}
