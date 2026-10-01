import { execFile } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { PNG } from "pngjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  compare,
  isGatePage,
  landingProblem,
  parseExpect,
  pathAndQuery,
  projectsFor,
  routeMatches,
  slug,
} from "../tools/app-shots.mjs";
import { ROOT } from "./source-files";

// tools/app-shots.mjs (spec §11.4, §12.1 L7a). `compare` on synthetic captures (in process);
// `capture` end to end - the REAL script in a child process, with the pinned Chromium - against a
// small local server that signs users in, redirects, answers 404 and serves a /dev/kit index.

const TOOL = path.join(ROOT, "tools/app-shots.mjs");
const SANDBOX = mkdtempSync(path.join(os.tmpdir(), "ops-ui-app-shots-test-"));
// Generous: dozens of temporary repositories (or captures), and a loaded machine is slow to delete them.
afterAll(() => rmSync(SANDBOX, { recursive: true, force: true }), 120_000);
const run = promisify(execFile);
const T = { timeout: 180_000 };

let counter = 0;
function dir(name: string) {
  const d = path.join(SANDBOX, `${name}-${++counter}`);
  mkdirSync(d, { recursive: true });
  return d;
}

// ---------------------------------------------------------------------------------------------
// compare, on synthetic captures
// ---------------------------------------------------------------------------------------------

/** A 24x24 white image with a dark disc whose edge pixels are anti-aliased greys. */
function disc(edit?: (png: PNG) => void) {
  const png = new PNG({ width: 24, height: 24 });
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      const d = Math.hypot(x - 11.5, y - 11.5);
      const coverage = Math.max(0, Math.min(1, 8 - d));
      const v = Math.round(255 - coverage * 200);
      const i = (y * 24 + x) * 4;
      png.data[i] = png.data[i + 1] = png.data[i + 2] = v;
      png.data[i + 3] = 255;
    }
  }
  edit?.(png);
  return PNG.sync.write(png);
}

type Route = { png?: Buffer; status?: number; user?: "editor" | "readonly" };
type Capture = { routes: Record<string, Route>; tokens?: Record<string, { declared: boolean; value?: string }>; complete?: boolean; projects?: string[] };

function writeCapture(root: string, label: string, capture: Capture) {
  const labelDir = path.join(root, label);
  const projects: Record<string, unknown> = {};
  for (const project of capture.projects ?? ["1440", "375-touch"]) {
    const projectDir = path.join(labelDir, project);
    mkdirSync(projectDir, { recursive: true });
    const routes: Record<string, unknown> = {};
    for (const [key, route] of Object.entries(capture.routes)) {
      const entry: Record<string, unknown> = { route: key.replace(/^readonly:/, ""), user: route.user ?? "editor", status: route.status ?? 200, landed: key };
      if (route.png) {
        entry.file = `${slug(key)}.png`;
        writeFileSync(path.join(projectDir, entry.file as string), route.png);
      }
      routes[key] = entry;
    }
    writeFileSync(path.join(projectDir, "tokens.json"), JSON.stringify({ route: "/", tokens: capture.tokens ?? {} }));
    projects[project] = { routes, tokens: "tokens.json" };
  }
  const complete = capture.complete ?? true;
  writeFileSync(
    path.join(labelDir, "manifest.json"),
    JSON.stringify({ app: "app", label, config: "x", baseUrl: "http://x", capturedAt: "2026-09-30T10:00:00.000Z", complete, failures: complete ? [] : ["/x: landed on /login"], projects }),
  );
}

const TOKENS = {
  "--color-primary": { declared: true, value: "oklch(0.45 0.12 250)" },
  "--color-accent": { declared: true, value: "oklch(0.64 0.13 60)" },
  "--color-external": { declared: false },
  "--ops-toast-offset": { declared: true, value: "3.75rem" },
};

const BASE: Capture = {
  routes: { "/": { png: disc() }, "/dev/kit": { png: disc() }, "/dev/kit/button--matrix": { png: disc() }, "readonly:/workers/1": { png: disc(), user: "readonly" } },
  tokens: TOKENS,
};

async function compareWith(main: Capture, branch: Capture, expectText?: string) {
  const root = dir("shots");
  writeCapture(root, "main", main);
  writeCapture(root, "branch", branch);
  let expectFile: string | undefined;
  if (expectText !== undefined) {
    expectFile = path.join(root, "expect.txt");
    writeFileSync(expectFile, expectText);
  }
  const out: string[] = [];
  const errors: string[] = [];
  const error = console.error;
  console.error = (line: string) => errors.push(line);
  try {
    const code = await compare({ app: "app", a: "main", b: "branch", expect: expectFile, root }, (line) => out.push(line));
    return { code, out: out.join("\n"), err: errors.join("\n"), root };
  } finally {
    console.error = error;
  }
}

describe("app-shots compare (synthetic captures)", () => {
  it("identical captures pass", async () => {
    const r = await compareWith(BASE, BASE);
    expect(r.code, r.err).toBe(0);
    expect(r.out).toContain("1440: 4 of 4 page(s) identical");
    expect(r.out).toContain("375-touch: 3 token(s) identical");
  });

  it("one changed pixel fails, an anti-aliased edge pixel included; --expect page allows it", async () => {
    // An edge pixel of the disc, one step lighter: what a radius or a weight change does, and what
    // Playwright's comparator would skip as anti-aliasing.
    const edge = disc((png) => {
      const i = (11 * 24 + 4) * 4; // on the disc's left edge
      expect(png.data[i]).toBeGreaterThan(55);
      expect(png.data[i]).toBeLessThan(255);
      png.data[i] += 1;
    });
    const branch = { ...BASE, routes: { ...BASE.routes, "/dev/kit/button--matrix": { png: edge } } };
    let r = await compareWith(BASE, branch);
    expect(r.code).toBe(1);
    expect(r.err).toContain("1440 /dev/kit/button--matrix: 1 pixel(s) differ");
    expect(r.err).toContain("375-touch /dev/kit/button--matrix: 1 pixel(s) differ");
    expect(existsSync(path.join(r.root, "main-vs-branch", "1440", `${slug("/dev/kit/button--matrix")}.png`))).toBe(true);
    r = await compareWith(BASE, branch, "# the fill\npage /dev/kit/button--matrix 1440\n");
    expect(r.code).toBe(1);
    expect(r.err).not.toContain("1440 /dev/kit/button--matrix");
    expect(r.err).toContain("375-touch /dev/kit/button--matrix: 1 pixel(s) differ");
    r = await compareWith(BASE, branch, "page /dev/kit/*\n");
    expect(r.code, r.err).toBe(0);
    expect(r.out).toContain("expected change (--expect line 1): 1440 /dev/kit/button--matrix: 1 pixel(s) differ");
  });

  it("a page of another size fails", async () => {
    const tall = PNG.sync.write(new PNG({ width: 24, height: 30 }));
    const r = await compareWith(BASE, { ...BASE, routes: { ...BASE.routes, "/": { png: tall } } });
    expect(r.code).toBe(1);
    expect(r.err).toContain("1440 /: expected 24x24, received 24x30");
  });

  it("a new token passes only when expected with its value; a changed one likewise", async () => {
    const branch = { ...BASE, tokens: { ...TOKENS, "--color-external": { declared: true, value: "oklch(0.64 0.13 60)" } } };
    let r = await compareWith(BASE, branch);
    expect(r.code).toBe(1);
    expect(r.err).toContain('1440 token --color-external: new in branch = oklch(0.64 0.13 60), not listed as "token --color-external = oklch(0.64 0.13 60)"');
    r = await compareWith(BASE, branch, "token --color-external = oklch(0.64 0.13 61)\n");
    expect(r.code).toBe(1);
    r = await compareWith(BASE, branch, "token --color-external = oklch(0.64 0.13 60)\n");
    expect(r.code, r.err).toBe(0);
    expect(r.out).toContain("expected new token (--expect line 1): 1440 token --color-external: new in branch = oklch(0.64 0.13 60)");

    const changed = { ...BASE, tokens: { ...TOKENS, "--color-primary": { declared: true, value: "oklch(0.45 0.12 251)" } } };
    r = await compareWith(BASE, changed);
    expect(r.code).toBe(1);
    expect(r.err).toContain("1440 token --color-primary: oklch(0.45 0.12 250) → oklch(0.45 0.12 251)");
    r = await compareWith(BASE, changed, "token --color-primary = oklch(0.45 0.12 251)\n");
    expect(r.code, r.err).toBe(0);
  });

  it("a vanished token fails unless listed as removed", async () => {
    const branch = { ...BASE, tokens: { ...TOKENS, "--ops-toast-offset": { declared: false } } };
    let r = await compareWith(BASE, branch);
    expect(r.code).toBe(1);
    expect(r.err).toContain('1440 token --ops-toast-offset: declared in main (3.75rem), not in branch, not listed as "removed token --ops-toast-offset"');
    const { ["--ops-toast-offset"]: _gone, ...without } = TOKENS;
    void _gone;
    r = await compareWith(BASE, { ...BASE, tokens: without });
    expect(r.code).toBe(1);
    r = await compareWith(BASE, branch, "removed token --ops-toast-offset\n");
    expect(r.code, r.err).toBe(0);
  });

  it("a new route (a new story id) passes only when expected; a 404 on main counts as absent", async () => {
    const branch = { ...BASE, routes: { ...BASE.routes, "/dev/kit/tag--title": { png: disc() } } };
    let r = await compareWith(BASE, branch);
    expect(r.code).toBe(1);
    expect(r.err).toContain('1440 /dev/kit/tag--title: a new route (not in main), not listed in --expect as "route /dev/kit/tag--title"');
    r = await compareWith(BASE, branch, "route /dev/kit/tag--title\n");
    expect(r.code, r.err).toBe(0);
    expect(r.out).toContain("1440 /dev/kit/tag--title: a new route (not in main) (--expect line 1)");
    // F5: main has no /dev/kit at all (404); the branch has the index and its stories.
    const main404 = { ...BASE, routes: { "/": { png: disc() }, "/dev/kit": { status: 404 }, "readonly:/workers/1": { png: disc(), user: "readonly" as const } } };
    r = await compareWith(main404, BASE);
    expect(r.code).toBe(1);
    expect(r.err).toContain("1440 /dev/kit: a new route (answered 404 in main)");
    r = await compareWith(main404, BASE, "route /dev/kit\nroute /dev/kit/*\n");
    expect(r.code, r.err).toBe(0);
  });

  it("a vanished story id fails unless listed; a route shot on neither side fails", async () => {
    const { ["/dev/kit/button--matrix"]: _story, ...rest } = BASE.routes;
    void _story;
    let r = await compareWith(BASE, { ...BASE, routes: rest });
    expect(r.code).toBe(1);
    expect(r.err).toContain('1440 /dev/kit/button--matrix: gone in branch (not captured), not listed in --expect as "removed route /dev/kit/button--matrix"');
    r = await compareWith(BASE, { ...BASE, routes: rest }, "removed route /dev/kit/button--matrix\n");
    expect(r.code, r.err).toBe(0);
    const both404 = { ...BASE, routes: { ...BASE.routes, "/workers/999": { status: 404 } } };
    r = await compareWith(both404, both404);
    expect(r.code).toBe(1);
    expect(r.err).toContain("1440 /workers/999: shot on neither side (404 / 404); fix the route (fixture ids?)");
  });

  it("read-only captures are their own routes", async () => {
    const edge = disc((png) => {
      png.data[0] -= 1;
    });
    const branch = { ...BASE, routes: { ...BASE.routes, "readonly:/workers/1": { png: edge, user: "readonly" as const } } };
    let r = await compareWith(BASE, branch, "page /workers/1\n");
    expect(r.code).toBe(1);
    expect(r.err).toContain("1440 readonly:/workers/1: 1 pixel(s) differ");
    r = await compareWith(BASE, branch, "page readonly:/workers/*\n");
    expect(r.code, r.err).toBe(0);
  });

  it("refuses an incomplete capture and a malformed --expect", async () => {
    let r = await compareWith({ ...BASE, complete: false }, BASE);
    expect(r.code).toBe(1);
    expect(r.err).toContain("the capture main is incomplete: /x: landed on /login");
    await expect(compareWith(BASE, BASE, "pages /x\n")).rejects.toThrow(/--expect: lines that are none of/);
    r = await compareWith(BASE, BASE, "route /nowhere\n");
    expect(r.code, r.err).toBe(0);
    expect(r.out).toContain("note: --expect line 1 (route /nowhere) matched nothing");
  });
});

describe("app-shots helpers", () => {
  it("reads --expect lines", () => {
    expect(parseExpect("# F3\ntoken --color-external = oklch(0.77 0.13 86)  # the accent\nroute /dev/kit\npage /reports 375 375-touch\nremoved token --x\nremoved route /y\n")).toEqual([
      { kind: "token", pattern: "--color-external", value: "oklch(0.77 0.13 86)", line: 2, used: false },
      { kind: "route", pattern: "/dev/kit", line: 3, used: false },
      { kind: "page", pattern: "/reports", projects: ["375", "375-touch"], line: 4, used: false },
      { kind: "removed token", pattern: "--x", line: 5, used: false },
      { kind: "removed route", pattern: "/y", line: 6, used: false },
    ]);
    // A hex colour in a value is not a comment.
    expect(parseExpect("token --shadow-card = 0 1px 2px #000 # F3\n#\n")).toEqual([
      { kind: "token", pattern: "--shadow-card", value: "0 1px 2px #000", line: 1, used: false },
    ]);
    expect(routeMatches("/dev/kit/*", "/dev/kit/button--matrix")).toBe(true);
    expect(routeMatches("/dev/kit/*", "/dev/kit")).toBe(false);
    expect(routeMatches("/transactions?tab=all", "/transactions?tab=all")).toBe(true);
    expect(routeMatches("/workers/*", "readonly:/workers/1")).toBe(false);
  });

  it("knows gate pages, landings and projects", () => {
    for (const gate of ["/login", "/login?error=1", "/two-factor", "/two-factor/setup", "/password", "/read-only?area=x"]) {
      expect(isGatePage(`http://localhost:3000${gate}`, "/login"), gate).toBe(true);
    }
    expect(isGatePage("http://localhost:3000/review", "/login")).toBe(false);
    expect(isGatePage("http://localhost:3000/sign-in", "/sign-in")).toBe(true);
    expect(landingProblem("/workers?q=a", "http://x/workers?q=a")).toBeNull();
    expect(landingProblem("/", "http://x/review", { "/": "/review" })).toBeNull();
    expect(landingProblem("/", "http://x/review")).toBe("/: landed on /review, not on /");
    expect(landingProblem("/settings", "http://x/two-factor/setup", { "/": "/review" })).toBe("/settings: landed on /two-factor/setup, not on /settings");
    expect(landingProblem("/", "http://x/login", { "/": "/review" })).toBe("/: landed on /login, not on /review (visual.redirects)");
    expect(pathAndQuery("/a?b=1#c")).toBe("/a?b=1");
    expect(projectsFor([1440, 375]).map((p) => [p.name, p.viewport.width, p.hasTouch])).toEqual([
      ["1440", 1440, false],
      ["375", 375, false],
      ["375-touch", 375, true],
    ]);
    expect(slug("/dev/kit/button--matrix")).toMatch(/^dev_kit_button--matrix-[0-9a-f]{8}$/);
    expect(slug("/")).not.toBe(slug("/?"));
  });
});

// ---------------------------------------------------------------------------------------------
// capture, end to end against a local server
// ---------------------------------------------------------------------------------------------

const USERS: Record<string, { password: string; session: string; lands: string; delay?: number }> = {
  "editor@example.invalid": { password: "pw-editor", session: "editor", lands: "/home" },
  "readonly@example.invalid": { password: "pw-readonly", session: "readonly", lands: "/home" },
  "owner@example.invalid": { password: "pw-owner", session: "owner", lands: "/two-factor/setup" },
  // Their own users, so the concurrent tests can count their sign-ins.
  "counted-editor@example.invalid": { password: "pw-editor", session: "editor", lands: "/home" },
  "counted-readonly@example.invalid": { password: "pw-readonly", session: "readonly", lands: "/home" },
  // A sign-in that answers late, like a dev server compiling the landing route on first hit.
  "slow@example.invalid": { password: "pw-slow", session: "editor", lands: "/home", delay: 3_000 },
};
/** POST /login per e-mail address, across both servers. */
const signIns: Record<string, number> = {};
// base.css's reduced-motion rule (the captures run with reduced motion): under it, a reused colour
// probe reads every --color-* as the first colour probed.
const MOTION = "@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; } }";
const CSS = `:root { --color-primary: oklch(0.45 0.12 250); --color-app-only: #ff0000; --color-second: #00ff00; --ops-toast-offset: 3.75rem; --text-detail: 13px; } body { margin: 0; font: 16px/1.4 sans-serif; } ${MOTION}`;
// The "branch": one colour changed (not the first probed) and two names outside the token
// families newly declared; nothing on the page uses them, so every page stays identical.
const BRANCH_CSS = CSS.replace("--color-second: #00ff00;", "--color-second: #0000ff; --shadow-card: 0 1px 2px #000; --tracking-snug: -0.01em;");
// The page's timers do not run under the capture's fixed clock; like React's scheduler (a message
// channel), the load event does.
const READY = (id: string) => `<script>addEventListener("load", () => document.querySelector('[data-story="${id}"]').setAttribute("data-ready", ""))</script>`;

let server: http.Server;
let branchServer: http.Server;
let baseUrl = "";
let branchBaseUrl = "";

function fakeApp(css: string) {
  return http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    const session = /session=(\w+)/.exec(req.headers.cookie ?? "")?.[1];
    const html = (body: string, status = 200) => {
      res.writeHead(status, { "content-type": "text/html; charset=utf-8" });
      res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body>${body}</body></html>`);
    };
    const redirect = (to: string, headers: Record<string, string> = {}) => {
      res.writeHead(302, { location: to, ...headers });
      res.end();
    };
    if (url.pathname === "/login" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        const form = new URLSearchParams(body);
        const email = form.get("email") ?? "";
        signIns[email] = (signIns[email] ?? 0) + 1;
        const user = USERS[email];
        if (!user || user.password !== form.get("password")) return redirect("/login?error=1");
        setTimeout(() => redirect(user.lands, { "set-cookie": `session=${user.session}; Path=/` }), user.delay ?? 0);
      });
      return;
    }
    if (url.pathname === "/login") {
      return html('<form method="post" action="/login"><input type="email" name="email"><input type="password" name="password"><button type="submit">Sign in</button></form>');
    }
    if (url.pathname === "/login-js") {
      // A client-side sign-in, like both apps' (fetch, then navigate): the submit itself starts no
      // navigation, so only the capture's login timeout waits for a late answer.
      return html(
        '<form id="f"><input type="email" name="email"><input type="password" name="password"><button type="submit">Sign in</button></form>' +
          '<script>f.addEventListener("submit", async (e) => { e.preventDefault(); const r = await fetch("/login", { method: "POST", body: new URLSearchParams(new FormData(f)) }); location.assign(r.url); });</script>',
      );
    }
    if (url.pathname === "/two-factor/setup") return html("<h1>Set up two-step sign-in</h1>");
    if (!session) return redirect("/login");
    switch (url.pathname) {
      case "/":
        return redirect("/home");
      case "/home":
        return html(`<h1>Home</h1><p>${session}</p>`);
      case "/gated":
        return redirect("/login");
      case "/tfa":
        return redirect("/two-factor/setup");
      case "/dev/kit":
        return html('<ul><li><a href="/dev/kit/alpha" data-story-id="alpha">alpha</a></li><li><a href="/dev/kit/beta" data-story-id="beta" data-story-open="#open">beta</a></li></ul>');
      case "/dev/kit/alpha":
        return html(`<div data-story="alpha">Alpha</div>${READY("alpha")}`);
      case "/dev/kit/beta":
        return html(`<div data-story="beta"><button id="open" onclick="document.getElementById('panel').hidden = false">Open</button><div id="panel" hidden style="width: 200px; height: 200px; background: #ff0000"></div></div>${READY("beta")}`);
      default:
        return html("<h1>Not found</h1>", 404);
    }
  });
}

async function listen(app: http.Server) {
  await new Promise<void>((resolve) => app.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(app.address() as AddressInfo).port}`;
}

beforeAll(async () => {
  server = fakeApp(CSS);
  branchServer = fakeApp(BRANCH_CSS);
  baseUrl = await listen(server);
  branchBaseUrl = await listen(branchServer);
});
afterAll(() => Promise.all([server, branchServer].map((app) => new Promise<void>((resolve) => app.close(() => resolve())))));

function config(visual: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  return {
    extensions: ["--color-sick"],
    ...extra,
    visual: {
      baseUrl,
      login: { path: "/login", userEnv: "OPS_UI_SHOTS_USER", passwordEnv: "OPS_UI_SHOTS_PASSWORD" },
      readonlyLogin: { userEnv: "OPS_UI_SHOTS_RO_USER", passwordEnv: "OPS_UI_SHOTS_RO_PASSWORD" },
      widths: [1440],
      routes: ["/home"],
      ...visual,
    },
  };
}

const CREDENTIALS = {
  OPS_UI_SHOTS_USER: "editor@example.invalid",
  OPS_UI_SHOTS_PASSWORD: "pw-editor",
  OPS_UI_SHOTS_RO_USER: "readonly@example.invalid",
  OPS_UI_SHOTS_RO_PASSWORD: "pw-readonly",
};

/** An app folder (the capture only reads its name and, without --config, its config file). */
function appDir(own?: object) {
  const app = path.join(dir("apps"), "fake-app");
  mkdirSync(app, { recursive: true });
  if (own) writeFileSync(path.join(app, "ops-ui.config.json"), JSON.stringify(own));
  return app;
}

async function captureRun(app: string, args: string[], env: Record<string, string> = CREDENTIALS, { label = "main", tmp = dir("tmp") } = {}) {
  const out = path.join(tmp, "ops-ui-shots", "fake-app", label);
  try {
    const { stdout, stderr } = await run(process.execPath, [TOOL, "capture", "--app", app, "--label", label, ...args], {
      env: { ...process.env, ...env, TMPDIR: tmp },
      encoding: "utf8",
      timeout: 170_000,
    });
    return { status: 0, stdout, stderr, out };
  } catch (error) {
    const e = error as { code?: number; stdout?: string; stderr?: string };
    return { status: e.code ?? -1, stdout: e.stdout ?? "", stderr: e.stderr ?? "", out };
  }
}

function withoutReadonlyCredentials() {
  return { OPS_UI_SHOTS_USER: CREDENTIALS.OPS_UI_SHOTS_USER, OPS_UI_SHOTS_PASSWORD: CREDENTIALS.OPS_UI_SHOTS_PASSWORD };
}

describe.concurrent("app-shots capture (the real script against a local server)", () => {
  it("shoots every route per width and at 375-touch, expands /dev/kit, records a 404, dumps the tokens", T, async ({ expect }) => {
    const app = appDir(config({ routes: ["/", "/home", "/dev/kit", "/missing"], redirects: { "/": "/home" }, readonlyRoutes: ["/home"] }));
    const r = await captureRun(app, []);
    expect(r.status, r.stderr).toBe(0);
    const manifest = JSON.parse(readFileSync(path.join(r.out, "manifest.json"), "utf8"));
    expect(manifest.complete).toBe(true);
    expect(Object.keys(manifest.projects)).toEqual(["1440", "375-touch"]);
    for (const project of ["1440", "375-touch"]) {
      const routes = manifest.projects[project].routes;
      expect(Object.keys(routes).sort()).toEqual(["/", "/dev/kit", "/dev/kit/alpha", "/dev/kit/beta", "/home", "/missing", "readonly:/home"]);
      expect(routes["/"]).toMatchObject({ status: 200, landed: "/home", user: "editor" });
      expect(routes["/missing"]).toEqual({ route: "/missing", user: "editor", status: 404, landed: "/missing" });
      expect(routes["/dev/kit/beta"].story).toBe("beta");
      expect(routes["readonly:/home"].user).toBe("readonly");
      for (const shot of Object.values(routes) as { file?: string; status: number }[]) {
        if (shot.status === 404) continue;
        const png = PNG.sync.read(readFileSync(path.join(r.out, project, shot.file as string)));
        expect(png.width).toBe(project === "1440" ? 1440 : 375);
      }
      const { tokens } = JSON.parse(readFileSync(path.join(r.out, project, "tokens.json"), "utf8"));
      expect(tokens["--color-primary"].declared).toBe(true);
      expect(tokens["--color-primary"].value).toMatch(/^(oklch|lab|rgb|color)\(/);
      expect(tokens["--color-accent"]).toEqual({ declared: false });
      expect(tokens["--color-sick"]).toEqual({ declared: false });
      expect(tokens["--color-app-only"].declared).toBe(true);
      expect(tokens["--ops-toast-offset"]).toEqual({ declared: true, value: "3.75rem" });
      expect(tokens["--text-detail"]).toEqual({ declared: true, value: "13px" });
    }
    // The story's open selector really was clicked (its panel is a red square) ...
    const red = (file: string) => {
      const png = PNG.sync.read(readFileSync(path.join(r.out, "1440", file)));
      let n = 0;
      for (let i = 0; i < png.data.length; i += 4) if (png.data[i] === 255 && png.data[i + 1] === 0 && png.data[i + 2] === 0) n += 1;
      return n;
    };
    expect(red(manifest.projects["1440"].routes["/dev/kit/beta"].file)).toBe(200 * 200);
    expect(red(manifest.projects["1440"].routes["/dev/kit/alpha"].file)).toBe(0);
    // ... and the read-only session really is the read-only user.
    const home = manifest.projects["1440"].routes["/home"];
    const readonlyHome = manifest.projects["1440"].routes["readonly:/home"];
    expect(readFileSync(path.join(r.out, "1440", home.file)).equals(readFileSync(path.join(r.out, "1440", readonlyHome.file)))).toBe(false);
  });

  it("fails a route redirected to /login or /two-factor/setup; a redirect listed in visual.redirects passes", T, async ({ expect }) => {
    const app = appDir(config({ routes: ["/", "/gated", "/tfa"], redirects: { "/": "/home" } }));
    const r = await captureRun(app, [], withoutReadonlyCredentials());
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("/gated: landed on /login, not on /gated");
    expect(r.stderr).toContain("/tfa: landed on /two-factor/setup, not on /tfa");
    expect(r.stderr).not.toContain("/: landed");
    const manifest = JSON.parse(readFileSync(path.join(r.out, "manifest.json"), "utf8"));
    expect(manifest.complete).toBe(false);
    expect(manifest.projects["1440"].routes["/gated"].file).toBeUndefined();
    expect(manifest.projects["1440"].routes["/"].file).toBeDefined();
  });

  it("fails a login that stays on the login page, and one that lands on a two-step page", T, async ({ expect }) => {
    const app = appDir(config());
    let r = await captureRun(app, ["--login-timeout", "2000"], { ...CREDENTIALS, OPS_UI_SHOTS_PASSWORD: "wrong" });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("editor login did not complete: landed on /login?error=1 (a gate page; waited up to 2000 ms, --login-timeout raises it)");
    r = await captureRun(app, [], { ...CREDENTIALS, OPS_UI_SHOTS_USER: "owner@example.invalid", OPS_UI_SHOTS_PASSWORD: "pw-owner" });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("editor login did not complete: landed on /two-factor/setup (a gate page;");
  });

  it("signs in once per user for the whole capture: every project reuses the session", T, async ({ expect }) => {
    // 3 projects (1440, 375, 375-touch) x 2 users: 6 sign-ins before; the apps allow 5 a minute.
    const app = appDir(config({ widths: [1440, 375], routes: ["/home", "/dev/kit"], readonlyRoutes: ["/home"] }));
    const before = { editor: signIns["counted-editor@example.invalid"] ?? 0, readonly: signIns["counted-readonly@example.invalid"] ?? 0 };
    const r = await captureRun(app, [], {
      ...CREDENTIALS,
      OPS_UI_SHOTS_USER: "counted-editor@example.invalid",
      OPS_UI_SHOTS_RO_USER: "counted-readonly@example.invalid",
    });
    expect(r.status, r.stderr).toBe(0);
    expect(signIns["counted-editor@example.invalid"] - before.editor).toBe(1);
    expect(signIns["counted-readonly@example.invalid"] - before.readonly).toBe(1);
    const manifest = JSON.parse(readFileSync(path.join(r.out, "manifest.json"), "utf8"));
    expect(Object.keys(manifest.projects).sort()).toEqual(["1440", "375", "375-touch"]);
    for (const project of Object.values(manifest.projects) as { routes: Record<string, { file?: string; landed: string }> }[]) {
      // Signed in everywhere: no route landed on /login, the read-only page is the read-only user's.
      expect(Object.keys(project.routes).sort()).toEqual(["/dev/kit", "/dev/kit/alpha", "/dev/kit/beta", "/home", "readonly:/home"]);
      expect(Object.values(project.routes).every((route) => route.file && route.landed !== "/login")).toBe(true);
    }
    const home = readFileSync(path.join(r.out, "375-touch", manifest.projects["375-touch"].routes["/home"].file));
    const readonlyHome = readFileSync(path.join(r.out, "375-touch", manifest.projects["375-touch"].routes["readonly:/home"].file));
    expect(home.equals(readonlyHome)).toBe(false);
  });

  it("the login timeout is configurable: a late sign-in fails under a short one and passes under visual.loginTimeout", T, async ({ expect }) => {
    const slow = { ...CREDENTIALS, OPS_UI_SHOTS_USER: "slow@example.invalid", OPS_UI_SHOTS_PASSWORD: "pw-slow" };
    const clientSide = (visual: Record<string, unknown> = {}) =>
      config({ login: { path: "/login-js", userEnv: "OPS_UI_SHOTS_USER", passwordEnv: "OPS_UI_SHOTS_PASSWORD" }, ...visual });
    let r = await captureRun(appDir(clientSide()), ["--login-timeout", "1000"], slow);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("editor login did not complete: landed on /login-js (a gate page; waited up to 1000 ms");
    r = await captureRun(appDir(clientSide({ loginTimeout: 20_000 })), [], slow);
    expect(r.status, r.stderr).toBe(0);
    // The default (60 s) is long enough for a dev server's first compile; L7a's 10 s was not.
    r = await captureRun(appDir(clientSide()), [], slow);
    expect(r.status, r.stderr).toBe(0);
    r = await captureRun(appDir(config({ loginTimeout: "60s" })), [], slow);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("visual.loginTimeout is a positive number of milliseconds");
    r = await captureRun(appDir(config()), ["--login-timeout", "soon"], slow);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("--login-timeout takes a positive number of milliseconds");
  });

  it("G3 sees colour values (a fresh probe per name) and fails a changed colour and newly declared names", T, async ({ expect }) => {
    const tmp = dir("tmp");
    const app = appDir();
    const mainConfig = path.join(dir("scratch"), "main.json");
    const branchConfig = path.join(dir("scratch"), "branch.json");
    writeFileSync(mainConfig, JSON.stringify(config()));
    writeFileSync(branchConfig, JSON.stringify(config({ baseUrl: branchBaseUrl })));
    const creds = withoutReadonlyCredentials();
    for (const [label, file] of [["main", mainConfig], ["main2", mainConfig], ["branch", branchConfig]]) {
      const r = await captureRun(app, ["--config", file], creds, { label, tmp });
      expect(r.status, r.stderr).toBe(0);
    }
    const root = path.join(tmp, "ops-ui-shots", "fake-app");
    // Every colour reads as its own value under reduced motion (a reused probe read all three as
    // the first one probed, --color-app-only's red).
    const { tokens } = JSON.parse(readFileSync(path.join(root, "main", "1440", "tokens.json"), "utf8"));
    expect(tokens["--color-app-only"].value).toBe("rgb(255, 0, 0)");
    expect(tokens["--color-second"].value).toBe("rgb(0, 255, 0)");
    expect(tokens["--color-primary"].value).not.toBe("rgb(255, 0, 0)");
    const compareIn = async (a: string, b: string, expectText?: string) => {
      const errors: string[] = [];
      const error = console.error;
      console.error = (line: string) => errors.push(line);
      let expectFile: string | undefined;
      if (expectText !== undefined) {
        expectFile = path.join(root, `${a}-${b}-expect.txt`);
        writeFileSync(expectFile, expectText);
      }
      try {
        const code = await compare({ app, a, b, expect: expectFile, root }, () => {});
        return { code, err: errors.join("\n") };
      } finally {
        console.error = error;
      }
    };
    let r = await compareIn("main", "main2");
    expect(r.code, r.err).toBe(0);
    r = await compareIn("main", "branch");
    expect(r.code).toBe(1);
    for (const project of ["1440", "375-touch"]) {
      expect(r.err).toContain(`${project} token --color-second: rgb(0, 255, 0) → rgb(0, 0, 255)`);
      // Newly declared, and outside the old dump families (--color/--text/--radius/--font/--ops).
      expect(r.err).toContain(`${project} token --shadow-card: new in branch = 0 1px 2px #000, not listed as "token --shadow-card = 0 1px 2px #000"`);
      expect(r.err).toContain(`${project} token --tracking-snug: new in branch = -0.01em`);
    }
    expect(r.err).not.toContain("pixel(s) differ");
    expect(r.err).not.toMatch(/--tw-/);
    // Listed with their values, the branch passes; a wrong value for a new name does not.
    r = await compareIn("main", "branch", "token --color-second = rgb(0, 0, 255)\ntoken --shadow-card = 0 1px 2px #000\ntoken --tracking-snug = -0.01em\n");
    expect(r.code, r.err).toBe(0);
    r = await compareIn("main", "branch", "token --color-second = rgb(0, 0, 255)\ntoken --shadow-card = 0 1px 2px #111\ntoken --tracking-snug = -0.01em\n");
    expect(r.code).toBe(1);
    expect(r.err).toContain("token --shadow-card: new in branch = 0 1px 2px #000");
  });

  it("reads --config instead of the app's own file; a missing config, or one without visual, is exit 2", T, async ({ expect }) => {
    // The app's own file would fail (its route redirects to /login); the scratch config is read.
    const app = appDir(config({ routes: ["/gated"] }));
    const scratch = path.join(dir("scratch"), "ops-ui.config.json");
    writeFileSync(scratch, JSON.stringify(config({ routes: ["/home"] })));
    let r = await captureRun(app, ["--config", scratch], withoutReadonlyCredentials());
    expect(r.status, r.stderr).toBe(0);
    const manifest = JSON.parse(readFileSync(path.join(r.out, "manifest.json"), "utf8"));
    expect(manifest.config).toBe(scratch);
    expect(Object.keys(manifest.projects["1440"].routes)).toEqual(["/home"]);

    r = await captureRun(app, ["--config", path.join(SANDBOX, "no-such-config.json")]);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("no capture config");
    r = await captureRun(appDir(), []);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("no capture config");
    const noVisual = path.join(dir("scratch"), "ops-ui.config.json");
    writeFileSync(noVisual, JSON.stringify({ extensions: [] }));
    r = await captureRun(app, ["--config", noVisual]);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('has no "visual" section');
    expect(existsSync(r.out)).toBe(false);
  });

  it("missing credentials are exit 2, before anything is launched or written", T, async ({ expect }) => {
    const app = appDir(config({ readonlyRoutes: ["/home"] }));
    let r = await captureRun(app, [], {});
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("set the environment variable OPS_UI_SHOTS_USER");
    r = await captureRun(app, [], withoutReadonlyCredentials());
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("set the environment variable OPS_UI_SHOTS_RO_USER");
    expect(existsSync(r.out)).toBe(false);
  });
});
