import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import ts from "typescript";
import { afterAll, describe, expect, it } from "vitest";
import {
  blankNonCode,
  changelogBetween,
  checkVendor,
  customPropertyDeclarations,
  kitDependents,
  kitImportGraph,
  moduleExports,
  satisfies,
  sha256,
  stableJson,
} from "../sync/sync-ops-ui.mjs";
import { ROOT, filesUnder, readSource } from "./source-files";

// The sync script end to end (spec §5, §11.1 `sync`): the REAL sync/sync-ops-ui.mjs, run with
// node against temporary git repositories - a fake library that ships the real ship.json,
// tokens.css and sync script, and a fake app that starts from a hand-copied script (step F2).

const SANDBOX = mkdtempSync(path.join(os.tmpdir(), "ops-ui-sync-test-"));
afterAll(() => rmSync(SANDBOX, { recursive: true, force: true }));
const T = { timeout: 60_000 };

const PEERS: Record<string, string> = {
  react: "19.2.4",
  "react-dom": "19.2.4",
  next: "16.2.10",
  tailwindcss: "4.1.14",
  clsx: "2.1.1",
  "tailwind-merge": "3.6.0",
  "class-variance-authority": "0.7.1",
};
const PKG = JSON.parse(readSource("package.json"));
const WFO_BRAND = readSource("gallery/brands/workforce.css").replace(/^html\[data-brand=workforce\] \{/m, ":root {");

let counter = 0;
function dir(name: string) {
  const d = path.join(SANDBOX, `${name}-${++counter}`);
  mkdirSync(d, { recursive: true });
  return d;
}

function git(repo: string, ...args: string[]) {
  return execFileSync(
    "git",
    ["-c", "user.name=Test", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", "-C", repo, ...args],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
}

function write(root: string, rel: string, content: string) {
  const file = path.join(root, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}

const BUTTON = `"use client";\n\nexport function Button() {\n  return null;\n}\nexport function ButtonLink() {\n  return null;\n}\nexport type ButtonTone = "a" | "b";\n`;
const BADGE = `import type { BadgeVariant } from "../types";\n\nexport type { BadgeVariant };\nexport const BADGE_TONES = ["neutral"];\nexport function Badge() {\n  return null;\n}\n`;

/** A library repo with its first release, v1.0.0. */
function library() {
  const lib = dir("lib");
  git(lib, "init", "-q", "-b", "main");
  write(lib, "package.json", `${JSON.stringify({ name: "@latro/ops-ui", version: "0.0.0", peerDependencies: PKG.peerDependencies }, null, 2)}\n`);
  write(lib, "src/version.ts", 'export const OPS_UI_VERSION = "0.0.0";\n');
  write(lib, "src/types.ts", 'export type BadgeVariant = "neutral";\n');
  write(lib, "src/components/button.tsx", BUTTON);
  write(lib, "src/components/badge.tsx", BADGE);
  write(lib, "styles/tokens.css", readSource("styles/tokens.css"));
  write(lib, "styles/kit.css", readSource("styles/kit.css"));
  write(lib, "TOKENS.md", "# Tokens\n");
  write(lib, "CHANGELOG.md", "# Changelog\n\n## 1.0.0 — 2026-09-30\nAdded: the kit.\n");
  write(lib, "ship.json", readSource("ship.json"));
  write(lib, "sync/sync-ops-ui.mjs", readSource("sync/sync-ops-ui.mjs"));
  write(lib, "sync/sync-ops-ui.d.mts", readSource("sync/sync-ops-ui.d.mts"));
  write(lib, "tests/never-shipped.test.ts", "// not shipped\n");
  git(lib, "add", "-A");
  git(lib, "commit", "-q", "-m", "L1: scaffold");
  release(lib, "1.0.0");
  return lib;
}

/** Commits `release: vX.Y.Z` (package.json + version.ts) and returns its hash. */
function release(lib: string, version: string) {
  const pkg = JSON.parse(readFileSync(path.join(lib, "package.json"), "utf8"));
  write(lib, "package.json", `${JSON.stringify({ ...pkg, version }, null, 2)}\n`);
  write(lib, "src/version.ts", `export const OPS_UI_VERSION = "${version}";\n`);
  git(lib, "add", "-A");
  git(lib, "commit", "-q", "-m", `release: v${version}`);
  return git(lib, "rev-parse", "HEAD");
}

/** Library change + release. */
function releaseWith(lib: string, version: string, changes: Record<string, string>, changelog = "") {
  for (const [rel, content] of Object.entries(changes)) write(lib, rel, content);
  if (changelog) {
    const current = readFileSync(path.join(lib, "CHANGELOG.md"), "utf8");
    write(lib, "CHANGELOG.md", current.replace("# Changelog\n\n", `# Changelog\n\n${changelog}\n`));
  }
  git(lib, "add", "-A");
  git(lib, "commit", "-q", "-m", `change for ${version}`);
  return release(lib, version);
}

/** An app at step F2: config, globals + brand css, installed peers, a hand-copied sync script. */
function app(lib: string, config: Record<string, unknown> = {}) {
  const a = dir("app");
  git(a, "init", "-q", "-b", "main");
  write(
    a,
    "ops-ui.config.json",
    JSON.stringify({
      source: lib,
      vendorDir: "src/vendor/ops-ui",
      globalsCss: "src/app/globals.css",
      brandCss: "src/app/brand.css",
      extensions: ["--color-tool"],
      ...config,
    }),
  );
  write(
    a,
    "src/app/globals.css",
    '@import "tailwindcss";\n@import "../vendor/ops-ui/styles/tokens.css";\n@import "./brand.css";\n\n@theme {\n  /* app extensions: no double quotes here */\n  --color-tool: oklch(0.74 0.1 195);\n}\n',
  );
  write(a, "src/app/brand.css", WFO_BRAND);
  for (const [name, version] of Object.entries(PEERS)) write(a, `node_modules/${name}/package.json`, JSON.stringify({ name, version }));
  cpSync(path.join(lib, "sync/sync-ops-ui.mjs"), path.join(a, "scripts/sync-ops-ui.mjs"));
  write(a, ".gitignore", "node_modules\n");
  git(a, "add", "-A");
  git(a, "commit", "-q", "-m", "app");
  return a;
}

function run(a: string, ...args: string[]) {
  const r = spawnSync(process.execPath, ["scripts/sync-ops-ui.mjs", ...args], {
    cwd: a,
    encoding: "utf8",
    env: { ...process.env, OPS_UI_REPO: "" },
  });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}

/**
 * A preload for `node --import` that records every file the sync writes, renames or removes, in
 * order (one `op<TAB>path` line each, paths relative to the app), into $OPS_UI_FS_LOG. The script
 * imports its fs functions by name; syncBuiltinESMExports makes those bindings the recorders.
 */
const FS_RECORDER = path.join(SANDBOX, "fs-recorder.mjs");
writeFileSync(
  FS_RECORDER,
  `import fs from "node:fs";
import path from "node:path";
import { syncBuiltinESMExports } from "node:module";
const originalWrite = fs.writeFileSync.bind(fs);
const append = (file, text) => originalWrite(file, text, { flag: "a" });
const rel = (p) => path.relative(process.cwd(), String(p)).split(path.sep).join("/");
const record = (op, ...targets) => append(process.env.OPS_UI_FS_LOG, op + "\\t" + targets.map(rel).join(" -> ") + "\\n");
for (const [name, op] of [["writeFileSync", "write"], ["renameSync", "rename"], ["rmSync", "rm"]]) {
  const original = fs[name].bind(fs);
  fs[name] = (target, ...rest) => {
    record(op, target, ...(op === "rename" ? [rest[0]] : []));
    return original(target, ...rest);
  };
}
syncBuiltinESMExports();
`,
);

/** Runs the sync with FS_RECORDER and returns the ordered file operations. */
function runRecorded(a: string, ...args: string[]) {
  const log = path.join(SANDBOX, `fs-log-${++counter}.txt`);
  writeFileSync(log, "");
  const r = spawnSync(process.execPath, ["--import", FS_RECORDER, "scripts/sync-ops-ui.mjs", ...args], {
    cwd: a,
    encoding: "utf8",
    env: { ...process.env, OPS_UI_REPO: "", OPS_UI_FS_LOG: log },
  });
  const ops = readFileSync(log, "utf8").split("\n").filter(Boolean);
  return { status: r.status, out: `${r.stdout}${r.stderr}`, ops };
}

/** Pin v1.0.0 the way F2 does: sync, the script updates itself, run again. */
function pinned(lib = library(), config: Record<string, unknown> = {}) {
  const a = app(lib, config);
  expect(run(a, "--version", "1.0.0").status).toBe(0);
  expect(run(a, "--version", "1.0.0").status).toBe(0);
  git(a, "add", "-A");
  git(a, "commit", "-q", "-m", "ops-ui 1.0.0");
  return { lib, a };
}

const lockOf = (a: string) => JSON.parse(readFileSync(path.join(a, "ops-ui.lock.json"), "utf8"));
const read = (a: string, rel: string) => readFileSync(path.join(a, rel), "utf8");
const clean = (a: string) => git(a, "status", "--porcelain") === "";

describe("sync: first pin, idempotence, self-update", () => {
  it("first pin: the vendor folder, the headers, the lock; the script updates itself last", T, () => {
    const lib = library();
    const commit = git(lib, "rev-parse", "HEAD");
    const a = app(lib);
    const first = run(a, "--version", "1.0.0");
    expect(first.status, first.out).toBe(0);
    expect(first.out).toContain("ops-ui (none) -> 1.0.0");
    expect(first.out).toContain("## 1.0.0 — 2026-09-30");
    expect(first.out.trim().split("\n").at(-1)).toBe("the sync script was updated - run the same command again");

    const lock = lockOf(a);
    expect(lock.version).toBe("1.0.0");
    expect(lock.commit).toBe(commit);
    expect(lock.dev).toBeUndefined();
    expect(Object.keys(lock.files)).toEqual([
      "scripts/sync-ops-ui.d.mts",
      "scripts/sync-ops-ui.mjs",
      "src/vendor/ops-ui/CHANGELOG.md",
      "src/vendor/ops-ui/TOKENS.md",
      "src/vendor/ops-ui/components/badge.tsx",
      "src/vendor/ops-ui/components/button.tsx",
      "src/vendor/ops-ui/styles/kit.css",
      "src/vendor/ops-ui/styles/tokens.css",
      "src/vendor/ops-ui/types.ts",
      "src/vendor/ops-ui/version.ts",
    ]);
    expect(read(a, "ops-ui.lock.json")).toBe(stableJson(lock));
    expect(Object.keys(lock)).toEqual(["commit", "files", "version"]);

    const sha7 = commit.slice(0, 7);
    expect(read(a, "src/vendor/ops-ui/components/button.tsx")).toBe(
      `// GENERATED from @latro/ops-ui v1.0.0 (${sha7}) by scripts/sync-ops-ui.mjs - do not edit; change ops-ui, release, sync.\n${BUTTON}`,
    );
    expect(read(a, "src/vendor/ops-ui/styles/tokens.css").split("\n")[0]).toBe(
      `/* GENERATED from @latro/ops-ui v1.0.0 (${sha7}) - do not edit. */`,
    );
    expect(read(a, "src/vendor/ops-ui/TOKENS.md").split("\n")[0]).toBe(`<!-- GENERATED from @latro/ops-ui v1.0.0 (${sha7}) - do not edit. -->`);
    expect(read(a, "scripts/sync-ops-ui.mjs").split("\n")[0]).toContain(`GENERATED from @latro/ops-ui v1.0.0 (${sha7})`);
    expect(read(a, "scripts/sync-ops-ui.d.mts")).toBe(
      `// GENERATED from @latro/ops-ui v1.0.0 (${sha7}) by scripts/sync-ops-ui.mjs - do not edit; change ops-ui, release, sync.\n${readSource("sync/sync-ops-ui.d.mts")}`,
    );
    for (const [file, hash] of Object.entries(lock.files)) expect(sha256(readFileSync(path.join(a, file))), file).toBe(hash);
    expect(existsSync(path.join(a, "src/vendor/ops-ui/tests"))).toBe(false);
    expect(existsSync(path.join(a, "src/vendor/ops-ui.ops-ui-tmp"))).toBe(false);
    expect(existsSync(path.join(a, "src/vendor/ops-ui.ops-ui-old"))).toBe(false);

    // The second run is the no-op sync under the new script.
    const second = run(a, "--version", "1.0.0");
    expect(second.status, second.out).toBe(0);
    expect(second.out).toContain("0 added, 0 changed, 0 removed");
    expect(second.out).not.toContain("the sync script was updated");
  });

  it("an idempotent re-run changes nothing (no diff)", T, async () => {
    const { a } = pinned();
    expect(clean(a)).toBe(true);
    const again = run(a, "--version", "1.0.0");
    expect(again.status, again.out).toBe(0);
    expect(clean(a)).toBe(true);
    expect((await checkVendor(a)).ok).toBe(true);
    const check = run(a, "--check");
    expect(check.status, check.out).toBe(0);
    expect(check.out).toContain("ops-ui 1.0.0: the vendored copy matches ops-ui.lock.json");
  });

  it("an upgrade updates the vendor folder, prints the CHANGELOG and writes the new script last", T, async () => {
    const { lib, a } = pinned();
    const newScript = `${readSource("sync/sync-ops-ui.mjs")}\n// v1.1.0 of the sync script\n`;
    const v11 = releaseWith(
      lib,
      "1.1.0",
      {
        "src/components/tag.tsx": 'export function Tag() {\n  return null;\n}\n',
        "sync/sync-ops-ui.mjs": newScript,
      },
      "## 1.1.0 — 2026-10-06\nAdded: Tag (components/tag.tsx).\n",
    );
    const up = runRecorded(a, "--version", "1.1.0");
    expect(up.status, up.out).toBe(0);
    expect(up.out).toContain("ops-ui 1.0.0 -> 1.1.0");
    // Every file changes: its header names the new version and commit.
    expect(up.out).toContain("1 added, 10 changed, 0 removed");
    expect(up.out).toContain("Added: Tag (components/tag.tsx).");
    expect(up.out).not.toContain("## 1.0.0");
    expect(up.out).toContain("components without a wrapper in src/components/ui: badge, button, tag");
    expect(up.out.trim().split("\n").at(-1)).toBe("the sync script was updated - run the same command again");
    expect(read(a, "scripts/sync-ops-ui.mjs")).toContain("// v1.1.0 of the sync script");
    expect(read(a, "scripts/sync-ops-ui.mjs").split("\n")[0]).toContain(`v1.1.0 (${v11.slice(0, 7)})`);
    // Written last, in this order: the vendor swap, the lock (which already pins the script's
    // new hash), the declarations, and the script itself as the very last file operation.
    const at = (op: string) => {
      const index = up.ops.indexOf(op);
      expect(index, `${op} in\n${up.ops.join("\n")}`).toBeGreaterThanOrEqual(0);
      return index;
    };
    const swap = at("rename\tsrc/vendor/ops-ui.ops-ui-tmp -> src/vendor/ops-ui");
    const lock = at("write\tops-ui.lock.json");
    const types = at("rename\tscripts/sync-ops-ui.d.mts.ops-ui-tmp -> scripts/sync-ops-ui.d.mts");
    const script = at("rename\tscripts/sync-ops-ui.mjs.ops-ui-tmp -> scripts/sync-ops-ui.mjs");
    expect(swap).toBeLessThan(lock);
    expect(lock).toBeLessThan(types);
    expect(types).toBeLessThan(script);
    expect(script).toBe(up.ops.length - 1);
    expect(up.ops.filter((op) => op.includes("scripts/sync-ops-ui.mjs"))).toEqual([
      "write\tscripts/sync-ops-ui.mjs.ops-ui-tmp",
      "rename\tscripts/sync-ops-ui.mjs.ops-ui-tmp -> scripts/sync-ops-ui.mjs",
    ]);
    expect(lockOf(a).files["scripts/sync-ops-ui.mjs"]).toBe(sha256(read(a, "scripts/sync-ops-ui.mjs")));
    expect((await checkVendor(a)).ok).toBe(true);
    const rerun = run(a, "--version", "1.1.0");
    expect(rerun.status, rerun.out).toBe(0);
    expect(rerun.out).not.toContain("the sync script was updated");
  });

  it("a file that left ship.json disappears with the old folder", T, () => {
    const { lib, a } = pinned();
    git(lib, "rm", "-q", "src/components/badge.tsx");
    releaseWith(lib, "1.1.0", {});
    const up = run(a, "--version", "1.1.0");
    expect(up.status, up.out).toBe(0);
    expect(up.out).toContain("1 removed");
    expect(existsSync(path.join(a, "src/vendor/ops-ui/components/badge.tsx"))).toBe(false);
    expect(lockOf(a).files["src/vendor/ops-ui/components/badge.tsx"]).toBeUndefined();
  });

  it("--dry-run prints the plan and writes nothing", T, () => {
    const a = app(library());
    const dry = run(a, "--version", "1.0.0", "--dry-run");
    expect(dry.status, dry.out).toBe(0);
    expect(dry.out).toContain("add     src/vendor/ops-ui/components/button.tsx");
    expect(dry.out).toContain("add     scripts/sync-ops-ui.mjs");
    expect(dry.out).toContain("nothing written");
    expect(clean(a)).toBe(true);
    expect(existsSync(path.join(a, "ops-ui.lock.json"))).toBe(false);
    expect(existsSync(path.join(a, "src/vendor"))).toBe(false);
  });
});

describe("sync: refusals", () => {
  it("a local edit is refused with a diff hint; --discard-local-edits overwrites it", T, async () => {
    const { a } = pinned();
    const button = "src/vendor/ops-ui/components/button.tsx";
    write(a, button, `${read(a, button)}// quick fix\n`);
    unlinkSync(path.join(a, "src/vendor/ops-ui/TOKENS.md"));
    const refused = run(a, "--version", "1.0.0");
    expect(refused.status).toBe(1);
    expect(refused.out).toContain("sync-ops-ui: refused");
    expect(refused.out).toContain(`local edit: ${button} was edited (see: git diff -- ${button})`);
    expect(refused.out).toContain("local edit: src/vendor/ops-ui/TOKENS.md is missing");
    expect(refused.out).toContain("fix it in ops-ui, release, sync");
    const vendor = await checkVendor(a);
    expect(vendor.ok).toBe(false);
    expect(vendor.edited).toEqual([button]);
    expect(vendor.missing).toEqual(["src/vendor/ops-ui/TOKENS.md"]);
    expect(run(a, "--check").status).toBe(1);
    const forced = run(a, "--version", "1.0.0", "--discard-local-edits");
    expect(forced.status, forced.out).toBe(0);
    expect(clean(a)).toBe(true);
    expect((await checkVendor(a)).ok).toBe(true);
  });

  it("an unknown file in the vendor folder is refused; --discard-local-edits removes it", T, async () => {
    const { a } = pinned();
    write(a, "src/vendor/ops-ui/components/mine.tsx", "export const mine = 1;\n");
    const refused = run(a, "--version", "1.0.0");
    expect(refused.status).toBe(1);
    expect(refused.out).toContain("unknown file: src/vendor/ops-ui/components/mine.tsx is not in ops-ui.lock.json");
    expect((await checkVendor(a)).unknown).toEqual(["src/vendor/ops-ui/components/mine.tsx"]);
    expect(run(a, "--version", "1.0.0", "--discard-local-edits").status).toBe(0);
    expect(existsSync(path.join(a, "src/vendor/ops-ui/components/mine.tsx"))).toBe(false);
    expect(clean(a)).toBe(true);
  });

  it("OS and editor litter in the vendor folder is neither unknown nor refused", T, async () => {
    const { a } = pinned();
    for (const litter of [".DS_Store", "components/.DS_Store", "components/._button.tsx", "Thumbs.db", "components/.button.tsx.swp"]) {
      write(a, `src/vendor/ops-ui/${litter}`, "litter");
    }
    const vendor = await checkVendor(a);
    expect(vendor.unknown).toEqual([]);
    expect(vendor.ok).toBe(true);
    const again = run(a, "--version", "1.0.0");
    expect(again.status, again.out).toBe(0);
    // A real unknown file beside the litter is still refused.
    write(a, "src/vendor/ops-ui/components/mine.tsx", "export const mine = 1;\n");
    expect((await checkVendor(a)).unknown).toEqual(["src/vendor/ops-ui/components/mine.tsx"]);
  });

  it("a collision is refused even with --discard-local-edits", T, () => {
    const { lib, a } = pinned();
    releaseWith(lib, "1.1.0", { "src/components/tag.tsx": "export function Tag() {\n  return null;\n}\n" });
    write(a, "src/vendor/ops-ui/components/tag.tsx", "// the app's own tag\n");
    for (const flags of [[], ["--discard-local-edits"]]) {
      const refused = run(a, "--version", "1.1.0", ...flags);
      expect(refused.status).toBe(1);
      expect(refused.out).toContain("collision: src/vendor/ops-ui/components/tag.tsx already exists and is not the library's; move the app's file");
    }
    expect(read(a, "src/vendor/ops-ui/components/tag.tsx")).toBe("// the app's own tag\n");
  });

  it("a downgrade is refused unless --allow-downgrade", T, () => {
    const { lib, a } = pinned();
    releaseWith(lib, "1.1.0", { "src/components/tag.tsx": "export function Tag() {\n  return null;\n}\n" });
    expect(run(a, "--version", "1.1.0").status).toBe(0);
    run(a, "--version", "1.1.0");
    const refused = run(a, "--version", "1.0.0");
    expect(refused.status).toBe(1);
    expect(refused.out).toContain("downgrade: 1.1.0 to 1.0.0 (pass --allow-downgrade to go back)");
    const back = run(a, "--version", "1.0.0", "--allow-downgrade");
    expect(back.status, back.out).toBe(0);
    expect(lockOf(a).version).toBe("1.0.0");
  });

  it("a release that moved is refused", T, () => {
    const { lib, a } = pinned();
    const pinnedAt = lockOf(a).commit;
    git(lib, "reset", "-q", "--hard", "HEAD~1");
    const moved = releaseWith(lib, "1.0.0", { "src/components/button.tsx": `${BUTTON}// rewritten history\n` });
    const refused = run(a, "--version", "1.0.0");
    expect(refused.status).toBe(1);
    expect(refused.out).toContain(`release v1.0.0 moved from ${pinnedAt} to ${moved}`);
  });

  it("disagreeing release markers are refused, and so is an ambiguous or missing release", T, () => {
    const lib = library();
    const a = app(lib);
    git(lib, "branch", "release/v1.0.0", "HEAD~1");
    const refused = run(a, "--version", "1.0.0");
    expect(refused.status).toBe(1);
    expect(refused.out).toContain("release markers disagree");
    git(lib, "branch", "-f", "release/v1.0.0", "HEAD");
    expect(run(a, "--version", "1.0.0").status).toBe(0);
    const missing = run(a, "--version", "9.0.0");
    expect(missing.status).toBe(1);
    expect(missing.out).toContain('no release v9.0.0 on main (no commit titled "release: v9.0.0")');
    git(lib, "commit", "-q", "--allow-empty", "-m", "release: v1.0.0");
    git(lib, "branch", "-D", "release/v1.0.0");
    const twice = run(a, "--version", "1.0.0");
    expect(twice.status).toBe(1);
    expect(twice.out).toContain("release v1.0.0 is ambiguous: 2 commits");
  });

  it("a missing required brand variable is refused, naming it", T, async () => {
    const { a } = pinned();
    write(a, "src/app/brand.css", WFO_BRAND.replace(/\n\s*--brand-accent: [^;]+;/, ""));
    const refused = run(a, "--version", "1.0.0");
    expect(refused.status).toBe(1);
    expect(refused.out).toContain("src/app/brand.css: missing required --brand-accent (for --color-accent)");
    expect((await checkVendor(a)).brand).toEqual(["src/app/brand.css: missing required --brand-accent (for --color-accent)"]);
  });

  it("the theme gotcha in the app's globals.css is refused", T, async () => {
    const { a } = pinned();
    write(a, "src/app/globals.css", read(a, "src/app/globals.css").replace("no double quotes here", 'the "tool" register'));
    const refused = run(a, "--version", "1.0.0");
    expect(refused.status).toBe(1);
    expect(refused.out).toMatch(/src\/app\/globals\.css:6: a comment inside @theme contains a double quote/);
    expect((await checkVendor(a)).theme).toHaveLength(1);
  });

  it("an app's own @theme declares only its listed extensions: no library token, no unlisted name (spec §8.5 check 7)", T, async () => {
    const { a } = pinned();
    const globals = read(a, "src/app/globals.css").replace(
      "  --color-tool: oklch(0.74 0.1 195);\n",
      [
        "  --color-tool: oklch(0.74 0.1 195);",
        "  --color-warning: oklch(0.6 0.2 60);",
        "  --color-primary: oklch(0.5 0.2 20);",
        "  --radius-control: 2px;",
        "  --color-new-unlisted: oklch(0.5 0.1 100);",
        "  --color-*: initial;",
        "",
      ].join("\n"),
    );
    write(a, "src/app/globals.css", globals);
    const expected = [
      "src/app/globals.css:8: its @theme declares --color-warning, a library token (spec §8.3: the library declares it; brand values go into src/app/brand.css as --brand-* variables)",
      "src/app/globals.css:9: its @theme declares --color-primary, a library token (spec §8.3: the library declares it; brand values go into src/app/brand.css as --brand-* variables)",
      "src/app/globals.css:10: its @theme declares --radius-control, a library token (spec §8.3: the library declares it; brand values go into src/app/brand.css as --brand-* variables)",
      "src/app/globals.css:11: its @theme declares --color-new-unlisted, which config.extensions does not list (an app's @theme holds only its listed extensions, spec §8.3; list it in ops-ui.config.json, or remove it)",
      "src/app/globals.css:12: its @theme declares --color-*, which config.extensions does not list (an app's @theme holds only its listed extensions, spec §8.3; list it in ops-ui.config.json, or remove it)",
    ];
    const refused = run(a, "--version", "1.0.0");
    expect(refused.status).toBe(1);
    for (const line of expected) expect(refused.out).toContain(line);
    const vendor = await checkVendor(a);
    expect(vendor.ok).toBe(false);
    expect(vendor.theme).toEqual(expected);
    // A listed extension is fine: list the new name and drop the rest, and the app passes again.
    write(a, "ops-ui.config.json", JSON.stringify({ ...JSON.parse(read(a, "ops-ui.config.json")), extensions: ["--color-tool", "--color-new-unlisted"] }));
    write(
      a,
      "src/app/globals.css",
      globals.replace(/ {2}--color-(warning|primary|\*): [^\n]*\n/g, "").replace(/ {2}--radius-control: [^\n]*\n/, ""),
    );
    expect((await checkVendor(a)).theme).toEqual([]);
    expect(run(a, "--version", "1.0.0").status).toBe(0);
  });

  it("a library token set by an ordinary rule, or a brand variable outside brand.css, is refused", T, async () => {
    const { a } = pinned();
    write(
      a,
      "src/app/globals.css",
      `${read(a, "src/app/globals.css")}\n:root {\n  --color-info: oklch(0.47 0.1 245);\n  --ops-toast-offset: 3.75rem;\n}\n@media (max-width: 640px) {\n  :root {\n    --brand-accent: oklch(0.6 0.13 60);\n    --page-gutter: 16px;\n  }\n}\n`,
    );
    const vendor = await checkVendor(a);
    expect(vendor.theme).toEqual([
      "src/app/globals.css:11: a rule sets --color-info, a library token (spec §8.3: the library declares it; brand values go into src/app/brand.css as --brand-* variables)",
      "src/app/globals.css:16: sets --brand-accent - brand variables live only in src/app/brand.css, where the contract checks read them (spec §8.4)",
    ]);
    expect(run(a, "--version", "1.0.0").status).toBe(1);
  });

  it("once globals.css imports the tokens it must import brand.css, after them", T, async () => {
    const { a } = pinned();
    const globals = read(a, "src/app/globals.css");
    write(a, "src/app/globals.css", globals.replace('@import "./brand.css";\n', ""));
    expect((await checkVendor(a)).theme).toEqual([
      "src/app/globals.css imports the library tokens but not src/app/brand.css (config.brandCss): import it after tokens.css (spec §8.4)",
    ]);
    expect(run(a, "--version", "1.0.0").status).toBe(1);
    write(
      a,
      "src/app/globals.css",
      globals.replace('@import "../vendor/ops-ui/styles/tokens.css";\n@import "./brand.css";\n', '@import "brand.css";\n@import "../vendor/ops-ui/styles/tokens.css";\n'),
    );
    expect((await checkVendor(a)).theme).toEqual([
      "src/app/globals.css:2: imports src/app/brand.css before the library tokens: import it after tokens.css (spec §8.4)",
    ]);
    // Before the tokens step (F2/W3) the app's own @theme is still its whole palette: not checked.
    write(
      a,
      "src/app/globals.css",
      '@import "tailwindcss";\n\n@theme {\n  --color-primary: oklch(0.45 0.12 250);\n  --color-tool: oklch(0.74 0.1 195);\n  --radius-control: 6px;\n}\n',
    );
    expect((await checkVendor(a)).theme).toEqual([]);
    expect(run(a, "--version", "1.0.0").status).toBe(0);
  });

  it("an extension-name clash is refused", T, () => {
    const lib = library();
    const a = app(lib, { extensions: ["--color-tool", "--color-surface"] });
    const refused = run(a, "--version", "1.0.0");
    expect(refused.status).toBe(1);
    expect(refused.out).toContain("extension clash: the library now declares --color-surface, an app extension (config.extensions)");
  });

  it("peers outside the library's range are refused", T, () => {
    const lib = library();
    const a = app(lib);
    write(a, "node_modules/next/package.json", JSON.stringify({ name: "next", version: "15.5.0" }));
    rmSync(path.join(a, "node_modules/clsx"), { recursive: true });
    const refused = run(a, "--version", "1.0.0");
    expect(refused.status).toBe(1);
    expect(refused.out).toContain("peer next 15.5.0 does not satisfy >=16.2 <17");
    expect(refused.out).toContain("peer clsx is not installed (the library needs ^2.1.1)");
  });

  it("a release shipping outside the vendor folder is malformed", T, () => {
    const lib = library();
    const ship = JSON.parse(readSource("ship.json"));
    ship.files.push({ from: "evil.ts", to: "src/app/page.ts" });
    releaseWith(lib, "1.0.1", { "ship.json": JSON.stringify(ship), "evil.ts": "export const x = 1;\n" });
    const refused = run(app(lib), "--version", "1.0.1");
    expect(refused.status).toBe(1);
    expect(refused.out).toContain(
      "the release is malformed: src/app/page.ts is outside src/vendor/ops-ui and is not scripts/sync-ops-ui.mjs or scripts/sync-ops-ui.d.mts",
    );
  });
});

describe("sync: dev builds, wrappers, usage", () => {
  it("--ref pins a dev build, which checkVendor refuses", T, async () => {
    const lib = library();
    write(lib, "src/components/button.tsx", `${BUTTON}// unreleased\n`);
    git(lib, "commit", "-q", "-am", "work in progress");
    const sha = git(lib, "rev-parse", "HEAD");
    const a = app(lib);
    const dev = run(a, "--ref", sha);
    expect(dev.status, dev.out).toBe(0);
    const lock = lockOf(a);
    expect(lock.dev).toBe(true);
    expect(lock.version).toBe(`1.0.0-dev+${sha.slice(0, 7)}`);
    expect(Object.keys(lock)).toEqual(["commit", "dev", "files", "version"]);
    expect(read(a, "src/vendor/ops-ui/components/button.tsx")).toContain("// unreleased");
    const vendor = await checkVendor(a);
    expect(vendor.dev).toBe(true);
    expect(vendor.ok).toBe(false);
    const check = run(a, "--check");
    expect(check.status).toBe(1);
    expect(check.out).toContain("dev sync");
    // A release replaces the dev pin.
    run(a, "--version", "1.0.0");
    expect(run(a, "--version", "1.0.0").status).toBe(0);
    expect((await checkVendor(a)).ok).toBe(true);
  });

  it("--write-wrappers creates pure named re-exports and never overwrites", T, () => {
    const { a } = pinned();
    write(a, "src/components/ui/button.tsx", "// the app's binding\nexport { Button } from './mine';\n");
    const out = run(a, "--write-wrappers");
    expect(out.status, out.out).toBe(0);
    expect(out.out).toContain("created src/components/ui/badge.tsx");
    expect(out.out).not.toContain("button.tsx");
    expect(read(a, "src/components/ui/button.tsx")).toBe("// the app's binding\nexport { Button } from './mine';\n");
    expect(read(a, "src/components/ui/badge.tsx")).toBe(
      'export { BADGE_TONES, Badge } from "@/vendor/ops-ui/components/badge";\nexport type { BadgeVariant } from "@/vendor/ops-ui/components/badge";\n',
    );
    const again = run(a, "--write-wrappers");
    expect(again.status).toBe(0);
    expect(again.out).toContain("every vendored component has a wrapper");
  });

  it("usage and environment errors exit 2", T, () => {
    const a = app(library());
    expect(run(a).status).toBe(2);
    expect(run(a, "--version", "1.0").out).toContain("--version takes X.Y.Z");
    expect(run(a, "--version", "1.0.0", "--ref", "abc").status).toBe(2);
    expect(run(a, "--frobnicate").status).toBe(2);
    write(a, "ops-ui.config.json", JSON.stringify({ ...JSON.parse(read(a, "ops-ui.config.json")), source: "/nowhere" }));
    const noRepo = run(a, "--version", "1.0.0");
    expect(noRepo.status).toBe(2);
    expect(noRepo.out).toContain("add_repo sasavincic/ops-ui");
  });
});

describe("sync helpers", () => {
  it("customPropertyDeclarations: every custom property with its line, @theme told from ordinary rules", () => {
    const css = [
      '@import "tailwindcss";',
      "@theme inline {",
      "  /* a comment; with --color-fake: 1 inside */",
      "  --color-a: oklch(1 0 0);",
      '  --font-x: "A; B", sans-serif;',
      "  @keyframes spin {",
      "    to { --inside-keyframes: 1; opacity: 1; }",
      "  }",
      "  --color-*: initial;",
      "}",
      ":root { --color-b: red; color: blue }",
      "@media (max-width: 640px) {",
      "  :root {",
      "    --brand-accent: red;",
      "  }",
      "}",
    ].join("\n");
    expect(customPropertyDeclarations(css)).toEqual([
      { name: "--color-a", line: 4, theme: true },
      { name: "--font-x", line: 5, theme: true },
      { name: "--inside-keyframes", line: 7, theme: false },
      { name: "--color-*", line: 9, theme: true },
      { name: "--color-b", line: 11, theme: false },
      { name: "--brand-accent", line: 14, theme: false },
    ]);
  });

  it("peer ranges: ^, >=, <, ||, x-ranges and exact", () => {
    expect(satisfies("16.2.10", ">=16.2 <17")).toBe(true);
    expect(satisfies("17.0.0", ">=16.2 <17")).toBe(false);
    expect(satisfies("16.1.9", ">=16.2 <17")).toBe(false);
    expect(satisfies("0.7.1", "^0.7.1")).toBe(true);
    expect(satisfies("0.8.0", "^0.7.1")).toBe(false);
    expect(satisfies("3.9.0", "^3.6")).toBe(true);
    expect(satisfies("3.5.9", "^3.6")).toBe(false);
    expect(satisfies("4.0.0", "^3.6")).toBe(false);
    expect(satisfies("2.1.1", "^2.1.1")).toBe(true);
    expect(satisfies("18.3.1", "^18 || ^19")).toBe(true);
    expect(satisfies("19.2.4", "19.2.4")).toBe(true);
    expect(satisfies("19.2.5", "19.2.x")).toBe(true);
    expect(satisfies("16.3.0-canary.2", ">=16.2 <17")).toBe(true);
  });

  it("module exports: runtime and type names in source order", () => {
    expect(moduleExports(readSource("src/components/button.tsx"))).toEqual({
      runtime: ["Button", "ButtonLink", "ExternalButtonLink", "FileLink", "AdminIconButton"],
      types: [],
    });
    expect(moduleExports(readSource("src/components/badge.tsx"))).toEqual({ runtime: ["Badge"], types: ["BadgeVariant"] });
    expect(moduleExports(readSource("src/components/combobox.tsx"))).toEqual({
      runtime: ["comboboxOptionMatches", "Combobox"],
      types: ["ComboboxOptionLine", "ComboboxOption"],
    });
    expect(moduleExports(readSource("src/components/callout.tsx"))).toEqual({
      runtime: ["CALLOUT_TONE", "Callout"],
      types: ["CalloutTone"],
    });
    expect(moduleExports(readSource("src/components/toast.tsx")).types).toEqual(["ToastAction", "ToastTone"]);
  });

  it("module exports: comments and literals never hide or fake an export", () => {
    const source = [
      'const accept = "application/pdf,image/*";',
      "export function Kept() {}",
      "const url = 'https://example.com'; export const notAtLineStart = 1;",
      "export const Also = `a ${`nested ${accept}`} /* not a comment`;",
      "const re = /\\/*x[/*]/g;",
      "export type Typed = { a: \"*/\" };",
      "// export function Commented() {}",
      "/*",
      "export function InAComment() {}",
      "*/",
      "const t = `",
      "export function InATemplate() {}",
      "`;",
      "export { Kept as Renamed, // a comment inside the braces",
      "  type Typed as TypedToo };",
    ].join("\n");
    expect(moduleExports(source)).toEqual({ runtime: ["Kept", "Also", "Renamed"], types: ["Typed", "TypedToo"] });
    // The blanked text keeps every line, so line numbers and line starts survive.
    expect(blankNonCode(source).split("\n")).toHaveLength(source.split("\n").length);
  });

  // Every component, against the TypeScript AST (runtime vs type exports, source order) and the
  // module's real runtime exports: --write-wrappers builds each wrapper from moduleExports, and a
  // name it missed (Textarea, lost to the "image/*" in field.tsx) breaks every app that imports it.
  const components = filesUnder("src/components").filter((file) => file.endsWith(".tsx"));
  it.each(components)("module exports of %s match the TypeScript AST and the runtime module", async (file) => {
    const source = readSource(file);
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const runtime: string[] = [];
    const types: string[] = [];
    const exported = (node: ts.Node) =>
      ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    for (const statement of ast.statements) {
      if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) {
          (statement.isTypeOnly || element.isTypeOnly ? types : runtime).push(element.name.text);
        }
      } else if (!exported(statement)) {
        continue;
      } else if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
        types.push(statement.name.text);
      } else if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) || ts.isEnumDeclaration(statement)) && statement.name) {
        runtime.push(statement.name.text);
      } else if (ts.isVariableStatement(statement)) {
        for (const d of statement.declarationList.declarations) if (ts.isIdentifier(d.name)) runtime.push(d.name.text);
      }
    }
    const found = moduleExports(source);
    expect(found).toEqual({ runtime, types });
    const mod = await import(path.join(ROOT, file));
    expect([...found.runtime].sort()).toEqual(Object.keys(mod).sort());
  });

  it("the kit's internal runtime imports, and what a KIT-OVERRIDE must override with it (spec §6.4)", () => {
    const sources = new Map(components.map((file) => [path.basename(file, ".tsx"), readSource(file)]));
    const graph = kitImportGraph(sources);
    expect(graph.get("confirm-dialog")).toEqual(["button", "dialog"]);
    expect(graph.get("dialog")).toEqual(["button", "toast"]); // its `import type` of action-icon is not a runtime edge
    expect(graph.get("date-input")).toEqual(["field"]);
    // The overrides §12.4 option 2 would need: each drags its importers along.
    expect(kitDependents(graph, "dialog")).toEqual(["confirm-dialog"]);
    expect(kitDependents(graph, "button")).toEqual(["confirm-dialog", "dialog", "record-tab", "row-menu"]);
    expect(kitDependents(graph, "date-input")).toEqual([]);
    expect(kitDependents(graph, "field")).toEqual(["combobox", "date-input", "search-form", "search-input", "url-select"]);
    const synthetic = kitImportGraph(
      new Map([
        ["a", 'import { B } from "./b";\nimport type { C } from "./c";\n'],
        ["b", 'import {\n  type T,\n  helper,\n} from "./c";\n'],
        ["c", ""],
        ["d", 'import { type OnlyAType } from "./a";\n'],
      ]),
    );
    expect(Object.fromEntries(synthetic)).toEqual({ a: ["b"], b: ["c"], c: [], d: [] });
    expect(kitDependents(synthetic, "c")).toEqual(["a", "b"]);
  });

  it("the CHANGELOG between two versions", () => {
    const log = "# Changelog\n\n## 2.0.0 — 2026-11-01\nVisible: x\n\n## 1.1.0 — 2026-10-06\nAdded: y\n\n## 1.0.0 — 2026-09-30\nAdded: z\n";
    expect(changelogBetween(log, "1.0.0", "2.0.0").map((s) => s.split("\n")[0])).toEqual([
      "## 2.0.0 — 2026-11-01",
      "## 1.1.0 — 2026-10-06",
    ]);
    expect(changelogBetween(log, null, "1.0.0").map((s) => s.split("\n")[0])).toEqual(["## 1.0.0 — 2026-09-30"]);
  });
});

it("the sync script is one self-contained file: node built-ins only", () => {
  const src = readFileSync(path.join(ROOT, "sync/sync-ops-ui.mjs"), "utf8");
  const imports = [...src.matchAll(/^import[^;]+from\s+"([^"]+)";/gm)].map((m) => m[1]);
  expect(imports.every((spec) => spec.startsWith("node:"))).toBe(true);
});
