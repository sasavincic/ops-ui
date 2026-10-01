// tools/app-shots.mjs - the per-app visual check of spec §11.4 (gates G2 and G3 of §12.0). Run from
// the library checkout: the apps carry no Playwright.
//
//   node tools/app-shots.mjs capture --app <app dir> --label <label> [--config <file>] [--login-timeout <ms>]
//   node tools/app-shots.mjs compare --app <app dir> <labelA> <labelB> [--expect <file>]
//
// capture   The app's dev server must be running (visual.baseUrl). Reads `visual` and `extensions`
//           from --config <file> (default: <app>/ops-ui.config.json; F0-F5 and W0-W6 pass the
//           scratch config their prepare step wrote, because main has no config until the swap
//           merges). Signs in as the fixture editor (visual.login; credentials from the env
//           variables it names, local database only) and, for visual.readonlyRoutes, as the
//           read-only user (visual.readonlyLogin): ONCE per user per capture, every project's
//           context reusing the session (Playwright storageState), because the apps allow five
//           email sign-ins a minute per client. After each sign-in it checks that the page left
//           login.path within the login timeout (--login-timeout <ms>, else visual.loginTimeout,
//           else 60 s: a dev server compiles the landing route on its first request) and landed
//           on no gate page. Every route of visual.routes (a string, or an object: below), at each of
//           visual.widths and at 375-touch (a phone: touch, a coarse pointer, no hover), with
//           reduced motion, the caret hidden, visual.mask masked and a clock fixed at the
//           capture's start and paused once the route is ready. Every route must land where it
//           was asked to (path and query), unless visual.redirects maps it to exactly the URL it
//           landed on. `/dev/kit` expands into the index plus one route per story link
//           (`a[data-story-id]`, spec §3.2): each waits for `[data-story=<id>][data-ready]`,
//           clicks its `data-story-open` selector, and is shot as its own route. A route
//           answering 404 is recorded as absent (a route the branch adds). Per width, the token
//           dump `tokens.json`: every contract token (styles/tokens.css), config.extensions and
//           every other custom property the page's style sheets declare (Tailwind's `--tw-*`
//           internals excepted), each with `declared` and, when declared, its value (colours read
//           through a fresh, transition-free probe element per name). Writes
//           $TMPDIR/ops-ui-shots/<app>/<label>/.
//           A page is shot until two screenshots in a row are identical, at most 1 + tries times
//           (visual.settleTries, default 10). A route OBJECT (1.6.0) instead of a string:
//             { "path": "/transactions/:first",                 the route's key in the capture
//               "resolve": { "from": "/transactions",            a list page opened first ...
//                            "selector": "a[href^='/transactions/']" },  ... whose first match's
//                                                               href is the route shot (a fixture
//                                                               id read at capture time)
//               "noise": { "pixels": 40, "reason": "…" },        a page that never settles: two
//                                                               shots differing by at most this
//                                                               many pixels count as settled, and
//                                                               compare lets the page differ by as
//                                                               many (reported, never silent)
//               "tries": 20 }                                   this route's settle tries
// compare   G2: every page of A and B compared with the gallery's gate, exactDiff of
//           gallery/shot-options.ts (every RGBA byte; 0 changed pixels, or at most the route's
//           `noise.pixels` when either capture recorded one), red-overlay diffs written
//           to $TMPDIR/ops-ui-shots/<app>/<A>-vs-<B>/. G3: every name declared in A declared in B
//           with an identical value. Anything else passes only when --expect lists it:
//             route <route>                 a route only B has (a 404 or absent in A)
//             page <route> [<project>…]     a page allowed to differ (every project if none named)
//             token <name> = <value>        a token new in B, or changed, with its value in B
//             removed route <route>         a route only A has
//             removed token <name>          a token only A declares
//           `#` followed by a space (or alone) starts a comment; `*` in a route matches any characters; a read-only capture is
//           the route `readonly:<route>`. A route a step adds (`/dev/kit/<storyId>`) is a new
//           route until main has it.
//
// Exit codes: 0 captured / identical within --expect; 1 a capture failure or a difference outside
// --expect; 2 usage or environment error (no config, no `visual`, no credentials, no capture).

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { parseTokenContract } from "../sync/sync-ops-ui.mjs";

const LIB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/** The phone project every capture adds to visual.widths (spec §11.2, §11.4). */
export const TOUCH_PROJECT = { name: "375-touch", viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true };
/** Pages a sign-in or a route must never land on (spec §3.3, §11.4). */
export const GATE_PAGES = ["/login", "/two-factor", "/password", "/read-only"];
/**
 * The dump reads every custom property the page's style sheets declare besides the contract,
 * except names with this prefix: Tailwind's per-utility internals (spec §11.4).
 */
export const DUMP_SKIPPED_PREFIX = "--tw-";
/** Extra screenshots a page gets to settle, by default (visual.settleTries, a route's `tries`). */
export const DEFAULT_SETTLE_TRIES = 10;
const STORY_TIMEOUT = 20_000;
/**
 * How long a sign-in may take to leave the login page, by default (visual.loginTimeout or
 * --login-timeout override it, in milliseconds): a client-side sign-in navigates late, and a dev
 * server compiles the landing route on its first request.
 */
export const DEFAULT_LOGIN_TIMEOUT = 60_000;
/** A first request to a dev server compiles the route: allow for it. */
const NAVIGATION_TIMEOUT = 120_000;
/** Next's dev tools (the indicator in <nextjs-portal>): not the app, and its state is transient. */
const HIDE_DEV_TOOLS = "nextjs-portal { display: none !important; }";

class CaptureFailure extends Error {}
class UsageError extends Error {}

// ---------------------------------------------------------------------------------------------
// Config, paths, routes
// ---------------------------------------------------------------------------------------------

/**
 * @typedef {{ path: string, userEnv: string, passwordEnv: string, userSelector?: string, passwordSelector?: string, submitSelector?: string }} Login
 * @typedef {{ pixels: number, reason: string }} Noise
 * @typedef {{ path: string, resolve?: { from: string, selector: string }, noise?: Noise, tries?: number }} RouteObject
 * @typedef {string | RouteObject} RouteEntry
 * @typedef {{ baseUrl: string, login: Login, readonlyLogin?: Omit<Login, "path"> & { path?: string }, widths: number[], routes: RouteEntry[], readonlyRoutes?: RouteEntry[], redirects?: Record<string, string>, mask?: string[], loginTimeout?: number, settleTries?: number }} Visual
 */

/**
 * A route entry's problems (1.6.0: a string, or `{ path, resolve?, noise?, tries? }`), each a
 * sentence; none = valid.
 * @param {unknown} entry
 * @param {string} where e.g. "visual.routes[2]"
 * @returns {string[]}
 */
export function routeEntryProblems(entry, where) {
  if (typeof entry === "string") return entry.startsWith("/") ? [] : [`${where} starts with /`];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [`${where} is a route or a route object`];
  const r = /** @type {Record<string, any>} */ (entry);
  const problems = [];
  for (const key of Object.keys(r)) if (!["path", "resolve", "noise", "tries"].includes(key)) problems.push(`${where}: unknown key "${key}" (path, resolve, noise, tries)`);
  if (typeof r.path !== "string" || !r.path.startsWith("/")) problems.push(`${where}.path starts with /`);
  if (r.resolve !== undefined) {
    if (typeof r.resolve?.from !== "string" || !r.resolve.from.startsWith("/") || typeof r.resolve?.selector !== "string" || !r.resolve.selector.trim()) {
      problems.push(`${where}.resolve is { "from": "/<list route>", "selector": "<css selector of a link>" }`);
    }
  }
  if (r.noise !== undefined) {
    if (!Number.isInteger(r.noise?.pixels) || r.noise.pixels < 1 || typeof r.noise?.reason !== "string" || !r.noise.reason.trim()) {
      problems.push(`${where}.noise is { "pixels": <a positive whole number>, "reason": "<why this page never settles>" }`);
    }
  }
  if (r.tries !== undefined && !(Number.isInteger(r.tries) && r.tries >= 1)) problems.push(`${where}.tries is a positive whole number`);
  return problems;
}

/** A route entry as an object. @param {RouteEntry} entry @returns {RouteObject} */
export function routeObject(entry) {
  return typeof entry === "string" ? { path: entry } : entry;
}

/**
 * Reads `visual` and `extensions` from the capture config.
 * @param {string} appRoot
 * @param {string | undefined} configFile
 * @returns {{ file: string, visual: Visual, extensions: string[] }}
 */
export function readCaptureConfig(appRoot, configFile) {
  const file = configFile ? path.resolve(configFile) : path.join(appRoot, "ops-ui.config.json");
  if (!existsSync(file)) {
    throw new UsageError(`no capture config: ${file} does not exist (pass --config <file>; until the swap merges, main has no ops-ui.config.json)`);
  }
  /** @type {{ visual?: Visual, extensions?: string[] }} */
  let config;
  try {
    config = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new UsageError(`${file} is not JSON: ${/** @type {Error} */ (error).message}`);
  }
  const visual = config.visual;
  if (!visual || typeof visual !== "object") throw new UsageError(`${file} has no "visual" section: nothing to capture`);
  const problems = [];
  if (typeof visual.baseUrl !== "string" || !/^https?:\/\//.test(visual.baseUrl)) problems.push("visual.baseUrl is an http(s) URL");
  if (!visual.login || typeof visual.login.path !== "string" || !visual.login.userEnv || !visual.login.passwordEnv) {
    problems.push("visual.login has path, userEnv and passwordEnv");
  }
  if (!Array.isArray(visual.widths) || visual.widths.length === 0 || !visual.widths.every((w) => Number.isInteger(w) && w > 0)) {
    problems.push("visual.widths is a list of pixel widths");
  }
  if (!Array.isArray(visual.routes) || visual.routes.length === 0) {
    problems.push("visual.routes is a list of routes starting with /");
  } else {
    visual.routes.forEach((r, i) => problems.push(...routeEntryProblems(r, `visual.routes[${i}]`)));
  }
  if (visual.readonlyRoutes !== undefined) {
    if (!Array.isArray(visual.readonlyRoutes)) problems.push("visual.readonlyRoutes is a list of routes");
    else visual.readonlyRoutes.forEach((r, i) => problems.push(...routeEntryProblems(r, `visual.readonlyRoutes[${i}]`)));
  }
  if (visual.settleTries !== undefined && !(Number.isInteger(visual.settleTries) && visual.settleTries >= 1)) {
    problems.push("visual.settleTries is a positive whole number");
  }
  if (visual.readonlyRoutes?.length && (!visual.readonlyLogin?.userEnv || !visual.readonlyLogin?.passwordEnv)) {
    problems.push("visual.readonlyRoutes needs visual.readonlyLogin (userEnv, passwordEnv)");
  }
  if (visual.loginTimeout !== undefined && !(Number.isInteger(visual.loginTimeout) && visual.loginTimeout > 0)) {
    problems.push("visual.loginTimeout is a positive number of milliseconds");
  }
  if (problems.length > 0) throw new UsageError(`${file}: ${problems.join("; ")}`);
  return { file, visual, extensions: Array.isArray(config.extensions) ? config.extensions : [] };
}

/** @param {string} appRoot */
export function appName(appRoot) {
  return path.basename(path.resolve(appRoot));
}

/** $TMPDIR/ops-ui-shots/<app>/ */
export function shotsRoot(appRoot) {
  return path.join(os.tmpdir(), "ops-ui-shots", appName(appRoot));
}

/** @param {string} label */
function checkLabel(label) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(label ?? "")) throw new UsageError(`a label is letters, digits, . _ - (got ${JSON.stringify(label)})`);
  return label;
}

/** The capture's projects: each configured width with a fine pointer, then the phone. */
export function projectsFor(/** @type {number[]} */ widths) {
  return [
    ...widths.map((width) => ({ name: String(width), viewport: { width, height: width >= 1024 ? 900 : 812 }, hasTouch: false, isMobile: false })),
    TOUCH_PROJECT,
  ];
}

/** Path and query of a URL or route, the way they are compared. */
export function pathAndQuery(/** @type {string} */ urlOrRoute, /** @type {string} */ base = "http://x") {
  const u = new URL(urlOrRoute, base);
  return u.pathname + u.search;
}

/** Is this landing a gate page (or the login page itself)? */
export function isGatePage(/** @type {string} */ landed, /** @type {string} */ loginPath) {
  const p = pathAndQuery(landed).split("?")[0];
  return [...GATE_PAGES, loginPath].some((gate) => p === gate || p.startsWith(`${gate}/`) || (gate === "/two-factor" && p.startsWith(gate)));
}

/**
 * A route landed where it was asked to, or where visual.redirects says it may.
 * @param {string} route
 * @param {string} landed
 * @param {Record<string, string>} redirects
 */
export function landingProblem(route, landed, redirects = {}) {
  const asked = pathAndQuery(route);
  const got = pathAndQuery(landed);
  if (got === asked) return null;
  const allowed = redirects[route];
  if (allowed !== undefined && pathAndQuery(allowed) === got) return null;
  return `${route}: landed on ${got}, not on ${allowed !== undefined ? `${pathAndQuery(allowed)} (visual.redirects)` : asked}`;
}

/** A file name for a route key: readable, and unique through a short hash. */
export function slug(/** @type {string} */ key) {
  const readable = key.replace(/^\//, "").replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80) || "root";
  return `${readable}-${createHash("sha256").update(key).digest("hex").slice(0, 8)}`;
}

// ---------------------------------------------------------------------------------------------
// capture
// ---------------------------------------------------------------------------------------------

/**
 * @typedef {{ route: string, user: "editor" | "readonly", status: number, landed: string, file?: string, story?: string, resolved?: string, noise?: number, settledWithin?: number }} RouteShot
 * @typedef {{ app: string, label: string, config: string, baseUrl: string, capturedAt: string, complete: boolean, failures: string[], projects: Record<string, { routes: Record<string, RouteShot>, tokens: string | null }> }} Manifest
 */

/** The token names every dump reads: the library contract plus the app's extensions. */
export function dumpNames(/** @type {string[]} */ extensions) {
  const contract = parseTokenContract(readFileSync(path.join(LIB, "styles/tokens.css"), "utf8"));
  return [...new Set([...contract.tokens.map((t) => t.token), ...extensions])];
}

/**
 * Runs in the page: which custom properties the style sheets declare, and the values of the named
 * ones plus every other declared name (Tailwind's `--tw-*` internals excepted).
 * @param {{ names: string[], internal: string }} input
 */
function readTokens({ names, internal }) {
  const declared = new Set();
  /** @param {CSSRuleList} rules */
  const visit = (rules) => {
    for (const rule of Array.from(rules)) {
      const style = /** @type {CSSStyleRule} */ (rule).style;
      if (style) for (let i = 0; i < style.length; i++) if (style[i].startsWith("--")) declared.add(style[i]);
      const inner = /** @type {CSSGroupingRule} */ (rule).cssRules;
      if (inner) visit(inner);
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      visit(sheet.cssRules);
    } catch {
      // A cross-origin sheet: its rules are not readable, and it is not the app's.
    }
  }
  // Every declared custom property is dumped except Tailwind's per-utility `--tw-*` internals: a
  // name outside the token families (a `--shadow-*` or `--tracking-*` a stray class in a scanned
  // file made Tailwind emit) is a CSS change too, and only a dumped name can fail G3.
  const all = [...new Set([...names, ...[...declared].filter((n) => !n.startsWith(internal))])].sort();
  /** @type {Record<string, { declared: boolean, value?: string }>} */
  const out = {};
  for (const name of all) {
    if (!declared.has(name)) {
      out[name] = { declared: false };
    } else if (name.startsWith("--color-")) {
      // A FRESH probe per name, with no transition. One reused probe is blind: under reduced
      // motion base.css gives every element `transition-duration: 0.01ms` (transition-property
      // stays `all`), so each new `color` starts a transition and the computed colour read at once
      // is still the previous one: every --color-* read as the first colour probed.
      const probe = document.createElement("i");
      probe.style.setProperty("transition", "none", "important");
      probe.style.color = `var(${name})`;
      document.body.append(probe);
      out[name] = { declared: true, value: getComputedStyle(probe).color };
      probe.remove();
    } else {
      out[name] = { declared: true, value: getComputedStyle(document.documentElement).getPropertyValue(name).trim() };
    }
  }
  return out;
}

/** @param {string} name @param {string} what */
function envValue(name, what) {
  const value = process.env[name];
  if (!value) throw new UsageError(`${what}: set the environment variable ${name} (the fixture user's credentials, local database only)`);
  return value;
}

/**
 * Signs in ONCE in its own context, checks the landing and returns the session (cookies and
 * storage) for every project's context to reuse: the apps allow five email sign-ins a minute per
 * client, and a capture has up to six projects × users.
 * @param {import("playwright-core").Browser} browser
 * @param {string} baseUrl
 * @param {Login} login
 * @param {string} who
 * @param {number} timeout
 */
async function signIn(browser, baseUrl, login, who, timeout) {
  const user = envValue(login.userEnv, `${who} sign-in`);
  const password = envValue(login.passwordEnv, `${who} sign-in`);
  const context = await browser.newContext({ baseURL: baseUrl, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  try {
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
    page.setDefaultTimeout(Math.max(timeout, 30_000));
    await page.goto(new URL(login.path, baseUrl).href, { waitUntil: "load" });
    const userField = page.locator(login.userSelector ?? 'input[type="email"], input[name="email"], input[name="username"], input[autocomplete="username"]').first();
    const passwordField = page.locator(login.passwordSelector ?? 'input[type="password"]').first();
    await userField.fill(user);
    await passwordField.fill(password);
    const before = page.url();
    if (login.submitSelector) await page.locator(login.submitSelector).first().click();
    else await passwordField.press("Enter");
    await page.waitForURL((url) => url.href !== before && pathAndQuery(url.href).split("?")[0] !== login.path, { timeout }).catch(() => {});
    await page.waitForLoadState("load").catch(() => {});
    const landed = page.url();
    if (isGatePage(landed, login.path)) {
      throw new CaptureFailure(`${who} login did not complete: landed on ${pathAndQuery(landed)} (a gate page; waited up to ${timeout} ms, --login-timeout raises it)`);
    }
    return await context.storageState();
  } finally {
    await context.close();
  }
}

/**
 * Settles a sequence of screenshots: the first shot that equals the one before it, or (with a
 * noise allowance) differs from it by at most `noise` pixels. Pure over a shot source, so it is
 * tested without a browser.
 * @param {() => Promise<Buffer>} shoot
 * @param {{ tries: number, noise?: number, diff?: (a: Buffer, b: Buffer) => { changed: number } }} options
 * @returns {Promise<{ png: Buffer, changed: number } | null>} null: never settled
 */
export async function settle(shoot, { tries, noise = 0, diff }) {
  let previous = await shoot();
  for (let i = 0; i < tries; i++) {
    const next = await shoot();
    if (next.equals(previous)) return { png: next, changed: 0 };
    if (noise > 0 && diff) {
      const changed = diff(next, previous).changed;
      if (changed <= noise) return { png: next, changed };
    }
    previous = next;
  }
  return null;
}

/**
 * Shoots until two screenshots in a row are identical (or within the route's noise): settled.
 * @param {import("playwright-core").Page} page
 * @param {string[]} mask
 * @param {{ tries: number, noise?: number, diff?: (a: Buffer, b: Buffer) => { changed: number } }} options
 */
async function stableShot(page, mask, options) {
  const shotOptions = /** @type {const} */ ({ fullPage: true, animations: "disabled", caret: "hide", scale: "css" });
  const masks = mask.map((selector) => page.locator(selector));
  return settle(() => page.screenshot({ ...shotOptions, mask: masks }), options);
}

/**
 * Opens the route's `resolve.from` page and returns the path and query of the first element
 * matching `resolve.selector` (its href), or a failure sentence.
 * @param {import("playwright-core").BrowserContext} context
 * @param {string} baseUrl
 * @param {RouteObject} route
 * @returns {Promise<{ route: string } | { problem: string }>}
 */
async function resolveRoute(context, baseUrl, route) {
  const resolve = /** @type {{ from: string, selector: string }} */ (route.resolve);
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
  try {
    await page.goto(new URL(resolve.from, baseUrl).href, { waitUntil: "load" });
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
    const href = await page
      .locator(resolve.selector)
      .first()
      .getAttribute("href", { timeout: 10_000 })
      .catch(() => null);
    if (!href) return { problem: `${route.path}: resolve found no "${resolve.selector}" with an href on ${resolve.from}` };
    return { route: pathAndQuery(href, baseUrl) };
  } finally {
    await page.close();
  }
}

/**
 * @param {{ context: import("playwright-core").BrowserContext, visual: Visual, dir: string, now: Date, failures: string[], diff: (a: Buffer, b: Buffer) => { changed: number } }} run
 * @param {{ route: string, key: string, user: "editor" | "readonly", story?: { id: string, open?: string }, tokens?: string[], path?: string, settle?: { tries?: number, noise?: Noise } }} target
 *   `route` is the URL shot; `path` the route's own key form when `resolve` replaced it
 * @returns {Promise<{ shot: RouteShot, tokens: Record<string, { declared: boolean, value?: string }> | null, storyLinks: { id: string, open?: string }[] }>}
 */
async function captureRoute(run, target) {
  const { context, visual, dir, now, failures } = run;
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
  try {
    await page.clock.setFixedTime(now);
    const response = await page.goto(new URL(target.route, visual.baseUrl).href, { waitUntil: "load" });
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
    await page.addStyleTag({ content: HIDE_DEV_TOOLS }).catch(() => {});
    const status = response?.status() ?? 0;
    const landed = pathAndQuery(page.url());
    /** @type {RouteShot} */
    const shot = { route: target.path ?? target.route, user: target.user, status, landed };
    if (target.path !== undefined && target.path !== target.route) shot.resolved = target.route;
    if (target.story) shot.story = target.story.id;
    const problem = landingProblem(target.route, page.url(), visual.redirects);
    if (problem) {
      failures.push(`${target.user === "readonly" ? "read-only " : ""}${problem}`);
      return { shot, tokens: null, storyLinks: [] };
    }
    if (status === 404) return { shot, tokens: null, storyLinks: [] };
    if (status >= 400 || status === 0) {
      failures.push(`${target.key}: answered ${status || "nothing"}`);
      return { shot, tokens: null, storyLinks: [] };
    }
    if (target.story) {
      const ready = page.locator(`[data-story="${target.story.id}"][data-ready]`);
      const found = await ready.waitFor({ timeout: STORY_TIMEOUT }).then(() => true, () => false);
      if (!found) {
        failures.push(`${target.key}: no [data-story="${target.story.id}"][data-ready] (an unknown story, or it never hydrated)`);
        return { shot, tokens: null, storyLinks: [] };
      }
    }
    await page.clock.pauseAt(now);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    if (target.story?.open) await page.locator(target.story.open).first().click();
    const tries = target.settle?.tries ?? visual.settleTries ?? DEFAULT_SETTLE_TRIES;
    const noise = target.settle?.noise?.pixels ?? 0;
    const settled = await stableShot(page, visual.mask ?? [], { tries, noise, diff: run.diff });
    if (!settled) {
      const within = noise > 0 ? ` within ${noise} pixel(s)` : " identical";
      failures.push(`${target.key}: the page never settled (${tries + 1} screenshots, no two${within}; raise "tries", or give the route a "noise" allowance with its reason)`);
      return { shot, tokens: null, storyLinks: [] };
    }
    if (noise > 0) {
      shot.noise = noise;
      shot.settledWithin = settled.changed;
    }
    shot.file = `${slug(target.key)}.png`;
    writeFileSync(path.join(dir, shot.file), settled.png);
    const tokens = target.tokens ? await page.evaluate(readTokens, { names: target.tokens, internal: DUMP_SKIPPED_PREFIX }) : null;
    const storyLinks = await page.$$eval("a[data-story-id]", (links) =>
      links.map((a) => ({ id: /** @type {string} */ (a.getAttribute("data-story-id")), open: a.getAttribute("data-story-open") ?? undefined })),
    );
    return { shot, tokens, storyLinks };
  } finally {
    await page.close();
  }
}

/** Launches the pinned Chromium (spec §11.2): never `playwright install`. */
async function launch() {
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync("/opt/pw-browsers")) process.env.PLAYWRIGHT_BROWSERS_PATH = "/opt/pw-browsers";
  const { chromium } = await import("@playwright/test");
  return chromium.launch();
}

/**
 * @param {{ app: string, label: string, config?: string, loginTimeout?: number, root?: string }} options
 *   `loginTimeout` (ms) overrides visual.loginTimeout; `root` (tests only) replaces
 *   $TMPDIR/ops-ui-shots/<app>
 * @param {(line: string) => void} log
 * @returns {Promise<number>}
 */
export async function capture(options, log) {
  const appRoot = path.resolve(options.app);
  const label = checkLabel(options.label);
  const { file, visual, extensions } = readCaptureConfig(appRoot, options.config);
  // The credentials are checked before anything is launched or written.
  envValue(visual.login.userEnv, "editor sign-in");
  envValue(visual.login.passwordEnv, "editor sign-in");
  if (visual.readonlyRoutes?.length && visual.readonlyLogin) {
    envValue(visual.readonlyLogin.userEnv, "read-only sign-in");
    envValue(visual.readonlyLogin.passwordEnv, "read-only sign-in");
  }
  const root = options.root ?? shotsRoot(appRoot);
  const dir = path.join(root, label);
  if (path.dirname(dir) !== root) throw new UsageError(`bad label ${label}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const now = new Date(Math.floor(Date.now() / 1000) * 1000);
  /** @type {string[]} */
  const failures = [];
  /** @type {Manifest} */
  const manifest = { app: appName(appRoot), label, config: file, baseUrl: visual.baseUrl, capturedAt: now.toISOString(), complete: false, failures, projects: {} };
  const names = dumpNames(extensions);
  const loginTimeout = options.loginTimeout ?? visual.loginTimeout ?? DEFAULT_LOGIN_TIMEOUT;
  const diff = await loadExactDiff();
  const browser = await launch();
  try {
    // One sign-in per user for the whole capture; every project's context reuses its session.
    const sessions = {
      editor: await signIn(browser, visual.baseUrl, visual.login, "editor", loginTimeout),
      readonly:
        visual.readonlyRoutes?.length && visual.readonlyLogin
          ? await signIn(browser, visual.baseUrl, /** @type {Login} */ ({ path: visual.login.path, ...visual.readonlyLogin }), "read-only", loginTimeout)
          : null,
    };
    for (const project of projectsFor(visual.widths)) {
      const projectDir = path.join(dir, project.name);
      mkdirSync(projectDir, { recursive: true });
      /** @type {Record<string, RouteShot>} */
      const routes = {};
      let tokensFile = /** @type {string | null} */ (null);
      /** @param {"editor" | "readonly"} user @param {RouteEntry[]} list */
      const shoot = async (user, list) => {
        const storageState = sessions[user] ?? undefined;
        const context = await browser.newContext({
          baseURL: visual.baseUrl,
          viewport: project.viewport,
          hasTouch: project.hasTouch,
          isMobile: project.isMobile,
          deviceScaleFactor: 1,
          reducedMotion: "reduce",
          storageState,
        });
        try {
          const run = { context, visual, dir: projectDir, now, failures, diff };
          for (const entry of list) {
            const routeEntry = routeObject(entry);
            const key = user === "readonly" ? `readonly:${routeEntry.path}` : routeEntry.path;
            let route = routeEntry.path;
            if (routeEntry.resolve) {
              const resolved = await resolveRoute(context, visual.baseUrl, routeEntry);
              if ("problem" in resolved) {
                failures.push(`${user === "readonly" ? "read-only " : ""}${resolved.problem}`);
                routes[key] = { route: routeEntry.path, user, status: 0, landed: "" };
                continue;
              }
              route = resolved.route;
            }
            const wantTokens = user === "editor" && tokensFile === null;
            const settleOptions = { tries: routeEntry.tries, noise: routeEntry.noise };
            const result = await captureRoute(run, { route, path: routeEntry.path, key, user, tokens: wantTokens ? names : undefined, settle: settleOptions });
            routes[key] = result.shot;
            if (result.tokens) {
              tokensFile = "tokens.json";
              writeFileSync(path.join(projectDir, tokensFile), `${JSON.stringify({ route: key, tokens: result.tokens }, null, 2)}\n`);
            }
            // /dev/kit: the index (just shot) lists the stories; each is its own route.
            if (pathAndQuery(route) === "/dev/kit" && result.shot.file) {
              for (const story of result.storyLinks) {
                const storyRoute = `/dev/kit/${story.id}`;
                const storyKey = user === "readonly" ? `readonly:${storyRoute}` : storyRoute;
                const storyResult = await captureRoute(run, { route: storyRoute, key: storyKey, user, story });
                routes[storyKey] = storyResult.shot;
              }
            }
          }
        } finally {
          await context.close();
        }
      };
      await shoot("editor", visual.routes);
      if (visual.readonlyRoutes?.length) await shoot("readonly", visual.readonlyRoutes);
      if (tokensFile === null) failures.push(`${project.name}: no token dump (no route of visual.routes was shot as the editor)`);
      manifest.projects[project.name] = { routes, tokens: tokensFile };
      const shot = Object.values(routes).filter((r) => r.file).length;
      log(`${project.name}: ${shot} page(s) shot, ${Object.values(routes).filter((r) => r.status === 404).length} absent (404)`);
    }
  } catch (error) {
    if (error instanceof CaptureFailure) failures.push(error.message);
    else throw error;
  } finally {
    await browser.close();
    manifest.complete = failures.length === 0;
    writeFileSync(path.join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  }
  if (failures.length > 0) {
    console.error(`app-shots: the capture ${label} failed`);
    for (const f of failures) console.error(f);
    return 1;
  }
  log(`captured ${manifest.app} ${label} into ${dir}`);
  return 0;
}

// ---------------------------------------------------------------------------------------------
// compare
// ---------------------------------------------------------------------------------------------

/**
 * @typedef {{ kind: "route" | "page" | "token" | "removed route" | "removed token", pattern: string, projects?: string[], value?: string, line: number, used: boolean }} Expectation
 */

/**
 * Parses an --expect file (see the header).
 * @param {string} text
 * @returns {Expectation[]}
 */
export function parseExpect(text) {
  /** @type {Expectation[]} */
  const out = [];
  const problems = [];
  for (const [i, raw] of text.split("\n").entries()) {
    // A comment is `#` at the start or after a space, followed by a space or the line's end, so a
    // value such as `0 1px 2px #000` keeps its hex colour.
    const line = raw.replace(/(^|\s)#(\s.*)?$/, "").trim();
    if (!line) continue;
    let m;
    if ((m = line.match(/^removed (route|token) (\S+)$/))) {
      out.push({ kind: /** @type {"removed route" | "removed token"} */ (`removed ${m[1]}`), pattern: m[2], line: i + 1, used: false });
    } else if ((m = line.match(/^token (--[A-Za-z0-9-]+)\s*=\s*(.+)$/))) {
      out.push({ kind: "token", pattern: m[1], value: m[2].trim(), line: i + 1, used: false });
    } else if ((m = line.match(/^route (\S+)$/))) {
      out.push({ kind: "route", pattern: m[1], line: i + 1, used: false });
    } else if ((m = line.match(/^page (\S+)((?:\s+\S+)*)$/))) {
      const projects = m[2].trim() ? m[2].trim().split(/\s+/) : undefined;
      out.push({ kind: "page", pattern: m[1], projects, line: i + 1, used: false });
    } else {
      problems.push(`line ${i + 1}: ${raw.trim()}`);
    }
  }
  if (problems.length > 0) {
    throw new UsageError(`--expect: lines that are none of route / page / token / removed route / removed token:\n${problems.join("\n")}`);
  }
  return out;
}

/** Does a route pattern (`*` = any characters) match a route key? */
export function routeMatches(/** @type {string} */ pattern, /** @type {string} */ key) {
  const re = new RegExp(`^${pattern.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`);
  return re.test(key);
}

/**
 * @param {Expectation[]} expect
 * @param {Expectation["kind"]} kind
 * @param {(e: Expectation) => boolean} test
 */
function expected(expect, kind, test) {
  const hit = expect.find((e) => e.kind === kind && test(e));
  if (hit) hit.used = true;
  return hit ?? null;
}

/** @param {string} dir @returns {Manifest} */
function readManifest(dir) {
  const file = path.join(dir, "manifest.json");
  if (!existsSync(file)) throw new UsageError(`no capture at ${dir} (run capture first)`);
  return JSON.parse(readFileSync(file, "utf8"));
}

/** The gallery's gate (gallery/shot-options.ts), loaded without Node's typeless-package notice. */
async function loadExactDiff() {
  const emit = process.emitWarning;
  process.emitWarning = /** @type {typeof process.emitWarning} */ (
    (/** @type {any} */ warning, /** @type {any[]} */ ...rest) => {
      const code = typeof rest[0] === "object" ? rest[0]?.code : rest[1];
      if (code === "MODULE_TYPELESS_PACKAGE_JSON") return;
      return emit.call(process, warning, ...rest);
    }
  );
  try {
    const shotOptions = await import("../gallery/shot-options.ts");
    return /** @type {(a: Buffer, b: Buffer) => { changed: number, sizeMismatch: string | null, diff: Buffer | null }} */ (shotOptions.exactDiff);
  } finally {
    process.emitWarning = emit;
  }
}

/**
 * @param {{ app: string, a: string, b: string, expect?: string, root?: string }} options `root`
 *   (tests only) replaces $TMPDIR/ops-ui-shots/<app>
 * @param {(line: string) => void} log
 * @returns {Promise<number>}
 */
export async function compare(options, log) {
  const appRoot = path.resolve(options.app);
  const root = options.root ?? shotsRoot(appRoot);
  const [labelA, labelB] = [checkLabel(options.a), checkLabel(options.b)];
  const dirA = path.join(root, labelA);
  const dirB = path.join(root, labelB);
  const A = readManifest(dirA);
  const B = readManifest(dirB);
  const expect = options.expect ? parseExpect(readFileSync(options.expect, "utf8")) : [];
  /** @type {string[]} */
  const failures = [];
  for (const [m, label] of [[A, labelA], [B, labelB]]) {
    if (!m.complete) failures.push(`the capture ${label} is incomplete: ${m.failures.join("; ")}`);
  }
  if (failures.length > 0) {
    for (const f of failures) console.error(f);
    return 1;
  }
  const exactDiff = await loadExactDiff();
  const outDir = path.join(root, `${labelA}-vs-${labelB}`);
  rmSync(outDir, { recursive: true, force: true });
  /** @type {string[]} */
  const report = [];
  const projects = [...new Set([...Object.keys(A.projects), ...Object.keys(B.projects)])];
  for (const project of projects) {
    const pa = A.projects[project];
    const pb = B.projects[project];
    if (!pa || !pb) {
      failures.push(`${project}: captured in ${pa ? labelA : labelB} only`);
      continue;
    }
    let identical = 0;
    const keys = [...new Set([...Object.keys(pa.routes), ...Object.keys(pb.routes)])].sort();
    for (const key of keys) {
      const a = pa.routes[key];
      const b = pb.routes[key];
      const aShot = a?.file ? path.join(dirA, project, a.file) : null;
      const bShot = b?.file ? path.join(dirB, project, b.file) : null;
      if (aShot && bShot) {
        const result = exactDiff(readFileSync(bShot), readFileSync(aShot));
        if (result.changed === 0) {
          identical += 1;
          continue;
        }
        // A route that never settles (its `noise`, recorded by either capture) may differ by as
        // many pixels; never silently, and never in size.
        const noise = Math.max(a?.noise ?? 0, b?.noise ?? 0);
        if (noise > 0 && !result.sizeMismatch && result.changed <= noise) {
          identical += 1;
          report.push(`${project} ${key}: ${result.changed} pixel(s) differ, within the route's noise allowance of ${noise}`);
          continue;
        }
        let diffNote = "";
        if (result.diff) {
          mkdirSync(path.join(outDir, project), { recursive: true });
          const diffFile = path.join(outDir, project, `${slug(key)}.png`);
          writeFileSync(diffFile, result.diff);
          diffNote = ` (diff: ${diffFile})`;
        }
        const what = `${project} ${key}: ${result.sizeMismatch ?? `${result.changed} pixel(s) differ`}${diffNote}`;
        const allowed = expected(expect, "page", (e) => routeMatches(e.pattern, key) && (!e.projects || e.projects.includes(project)));
        if (allowed) report.push(`expected change (--expect line ${allowed.line}): ${what}`);
        else failures.push(what);
      } else if (!aShot && bShot) {
        const allowed = expected(expect, "route", (e) => routeMatches(e.pattern, key));
        const what = `${project} ${key}: a new route (${a ? `answered ${a.status} in ${labelA}` : `not in ${labelA}`})`;
        if (allowed) report.push(`${what} (--expect line ${allowed.line})`);
        else failures.push(`${what}, not listed in --expect as "route ${key}"`);
      } else if (aShot && !bShot) {
        const allowed = expected(expect, "removed route", (e) => routeMatches(e.pattern, key));
        const what = `${project} ${key}: gone in ${labelB} (${b ? `answered ${b.status}` : "not captured"})`;
        if (allowed) report.push(`${what} (--expect line ${allowed.line})`);
        else failures.push(`${what}, not listed in --expect as "removed route ${key}"`);
      } else {
        failures.push(`${project} ${key}: shot on neither side (${a?.status ?? "-"} / ${b?.status ?? "-"}); fix the route (fixture ids?)`);
      }
    }
    report.push(`${project}: ${identical} of ${keys.length} page(s) identical`);

    // Tokens (G3).
    const ta = pa.tokens ? JSON.parse(readFileSync(path.join(dirA, project, pa.tokens), "utf8")).tokens : {};
    const tb = pb.tokens ? JSON.parse(readFileSync(path.join(dirB, project, pb.tokens), "utf8")).tokens : {};
    let same = 0;
    for (const name of [...new Set([...Object.keys(ta), ...Object.keys(tb)])].sort()) {
      const x = ta[name];
      const y = tb[name];
      if (x?.declared) {
        if (!y?.declared) {
          const allowed = expected(expect, "removed token", (e) => e.pattern === name);
          const what = `${project} token ${name}: declared in ${labelA} (${x.value}), not in ${labelB}`;
          if (allowed) report.push(`${what} (--expect line ${allowed.line})`);
          else failures.push(`${what}, not listed as "removed token ${name}"`);
        } else if (x.value !== y.value) {
          const allowed = expected(expect, "token", (e) => e.pattern === name && e.value === y.value);
          const what = `${project} token ${name}: ${x.value} → ${y.value}`;
          if (allowed) report.push(`expected change (--expect line ${allowed.line}): ${what}`);
          else failures.push(`${what}, not listed as "token ${name} = ${y.value}"`);
        } else {
          same += 1;
        }
      } else if (y?.declared) {
        const allowed = expected(expect, "token", (e) => e.pattern === name && e.value === y.value);
        const what = `${project} token ${name}: new in ${labelB} = ${y.value}`;
        if (allowed) report.push(`expected new token (--expect line ${allowed.line}): ${what}`);
        else failures.push(`${what}, not listed as "token ${name} = ${y.value}"`);
      }
    }
    report.push(`${project}: ${same} token(s) identical`);
  }
  for (const e of expect.filter((x) => !x.used)) report.push(`note: --expect line ${e.line} (${e.kind} ${e.pattern}) matched nothing`);
  for (const line of report) log(line);
  if (failures.length > 0) {
    console.error(`app-shots: ${labelA} and ${labelB} differ outside --expect (${failures.length})`);
    for (const f of failures) console.error(f);
    return 1;
  }
  log(`app-shots: ${labelA} and ${labelB} are identical${expect.length ? " within --expect" : ""}`);
  return 0;
}

// ---------------------------------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------------------------------

const USAGE = [
  "usage:",
  "  node tools/app-shots.mjs capture --app <app dir> --label <label> [--config <file>] [--login-timeout <ms>]",
  "  node tools/app-shots.mjs compare --app <app dir> <labelA> <labelB> [--expect <file>]",
].join("\n");

/** @param {string[]} argv */
export function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (command !== "capture" && command !== "compare") throw new UsageError(USAGE);
  /** @type {{ command: "capture" | "compare", app?: string, label?: string, config?: string, loginTimeout?: number, expect?: string, labels: string[] }} */
  const out = { command, labels: [] };
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    const value = () => {
      const v = rest[++i];
      if (v === undefined || v.startsWith("--")) throw new UsageError(`${arg} needs a value\n${USAGE}`);
      return v;
    };
    if (arg === "--app") out.app = value();
    else if (arg === "--label" && command === "capture") out.label = value();
    else if (arg === "--config" && command === "capture") out.config = value();
    else if (arg === "--login-timeout" && command === "capture") {
      const ms = Number(value());
      if (!Number.isInteger(ms) || ms <= 0) throw new UsageError(`--login-timeout takes a positive number of milliseconds\n${USAGE}`);
      out.loginTimeout = ms;
    }
    else if (arg === "--expect" && command === "compare") out.expect = value();
    else if (!arg.startsWith("--") && command === "compare") out.labels.push(arg);
    else throw new UsageError(`unknown argument ${arg}\n${USAGE}`);
  }
  if (!out.app) throw new UsageError(`--app is required\n${USAGE}`);
  if (command === "capture" && !out.label) throw new UsageError(`--label is required\n${USAGE}`);
  if (command === "compare" && out.labels.length !== 2) throw new UsageError(`compare takes two labels\n${USAGE}`);
  return out;
}

/** @param {string[]} argv */
export async function main(argv) {
  const log = (/** @type {string} */ line) => console.log(line);
  try {
    const args = parseArgs(argv);
    if (args.command === "capture") {
      return await capture({ app: /** @type {string} */ (args.app), label: /** @type {string} */ (args.label), config: args.config, loginTimeout: args.loginTimeout }, log);
    }
    return await compare({ app: /** @type {string} */ (args.app), a: args.labels[0], b: args.labels[1], expect: args.expect }, log);
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`app-shots: ${error.message}`);
      return 2;
    }
    console.error(`app-shots: ${/** @type {Error} */ (error).stack ?? error}`);
    return 2;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exitCode = await main(process.argv.slice(2));
}
