import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { sha256, shipPlan, stableJson } from "../sync/sync-ops-ui.mjs";
import { ROOT, readSource } from "./source-files";

// What an app's Tailwind scans (spec §8.4). A release ships more than the kit's code into the
// app tree: DESIGN.md, TOKENS.md and CHANGELOG.md in the vendor folder, and the sync script under
// scripts/. The adoption adds two files at the app root: ops-ui.config.json (§3.3, app-owned) and
// ops-ui.lock.json (§5.3, written by the sync). Tailwind emits a class, or a theme variable, for
// any name it finds in a scanned file (TOKENS.md names --color-sick-subtle, which Workforce Ops
// declares and never uses; the CHANGELOG names bg-primary/10; the sync script names --color-tool;
// the config lists --color-sick-subtle among its extensions), and it scans those files twice over:
// through @source "../vendor/ops-ui" and through automatic detection (none of them is ignored;
// automatic detection reads JSON at the root). So without the template's four `@source not` lines
// a docs-only release, or any edit of the config, would change an app's CSS and its G3 token dump.
// This test builds an app from the §8.4 template, ship.json, the §3.3 config and a lock, compiles
// it with the pinned Tailwind, and requires the CSS to be the same whatever those files say.

const require = createRequire(import.meta.url);
const tailwind = require("@tailwindcss/postcss") as (options: { base: string; optimize: boolean }) => unknown;
const postcss = createRequire(require.resolve("@tailwindcss/postcss"))("postcss") as (plugins: unknown[]) => {
  process: (css: string, options: { from: string }) => Promise<{ css: string }>;
};

const SPEC = readSource("docs/superpowers/specs/2026-09-30-ops-ui-library.md");

/** The fenced block (css by default) of the spec whose first line starts with `firstLine`. */
function specBlock(firstLine: string, lang = "css"): string {
  const fence = "```" + lang + "\n";
  const start = SPEC.indexOf(fence + firstLine);
  expect(start, `the spec has a ${lang} block starting ${firstLine}`).toBeGreaterThan(-1);
  const body = start + fence.length;
  return SPEC.slice(body, SPEC.indexOf("```", body));
}

const TEMPLATE = specBlock("/* src/app/globals.css");
const BRAND = specBlock("/* Workforce Ops brand");
/** The §3.3 config as the spec writes it: Workforce Ops' values, its extensions included. */
const CONFIG = specBlock('{\n  "source": "../ops-ui"', "json");
/** The two app-root files the adoption adds, with the config's and the lock's names. */
const ROOT_FILES = ["ops-ui.config.json", "ops-ui.lock.json"];
const VENDOR = "src/vendor/ops-ui";
const PLAN = shipPlan(
  JSON.parse(readSource("ship.json")),
  execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }).trim().split("\n"),
  VENDOR,
);
/** What a release ships that is not the kit's code or styles: the docs and the sync script. */
const NOT_KIT = PLAN.filter(({ dest }) => !/\.(tsx?|css)$/.test(dest) || !dest.startsWith(`${VENDOR}/`));

// Names nothing else in the test app uses: a Workforce Ops extension token it never uses, library
// tokens the kit never reads, and utilities the kit never writes.
const POISON = "--color-sick-subtle var(--color-sidebar-hover) bg-sick-subtle text-tool border-sidebar-border underline-offset-8 decoration-wavy";

const SANDBOX = mkdtempSync(path.join(os.tmpdir(), "ops-ui-app-scan-"));
afterAll(() => rmSync(SANDBOX, { recursive: true, force: true }));

/** The lock a sync of this checkout would write (§5.3): every shipped file's hash. */
function lockFor(): string {
  const files = Object.fromEntries(PLAN.map(({ src, dest }) => [dest, sha256(readFileSync(path.join(ROOT, src)))]));
  return stableJson({ commit: "0".repeat(40), files, version: "1.0.0" });
}

/**
 * An app tree from the template, with the shipped files, the §3.3 config and a lock (`override`
 * replaces some contents: a string is written, null leaves the file out).
 */
function app(name: string, globals: string, override?: (dest: string) => string | null | undefined) {
  const root = path.join(SANDBOX, name);
  const write = (rel: string, content: string) => {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), content);
  };
  write("src/app/globals.css", globals);
  write("src/app/brand.css", BRAND);
  for (const { src, dest } of PLAN) {
    const replaced = override?.(dest);
    if (replaced === null) continue;
    if (replaced !== undefined) write(dest, replaced);
    else {
      mkdirSync(path.dirname(path.join(root, dest)), { recursive: true });
      copyFileSync(path.join(ROOT, src), path.join(root, dest));
    }
  }
  const rootFiles: Record<string, string> = { "ops-ui.config.json": CONFIG, "ops-ui.lock.json": lockFor() };
  for (const [file, content] of Object.entries(rootFiles)) {
    const replaced = override?.(file);
    if (replaced === null) continue;
    write(file, replaced ?? content);
  }
  // `@import "tailwindcss"` resolves from the app; automatic detection never scans node_modules.
  symlinkSync(path.join(ROOT, "node_modules"), path.join(root, "node_modules"), "dir");
  return root;
}

async function compile(root: string) {
  const from = path.join(root, "src/app/globals.css");
  const result = await postcss([tailwind({ base: root, optimize: false })]).process(readFileSync(from, "utf8"), { from });
  return result.css;
}

/** Everything the scan must never read: the docs and script a release ships, the config and the lock. */
const notScanned = (dest: string) => ROOT_FILES.includes(dest) || NOT_KIT.some((entry) => entry.dest === dest);
const poisoned = (dest: string) =>
  notScanned(dest) ? (dest.endsWith(".json") ? `${JSON.stringify({ poison: POISON.split(" ") }, null, 2)}\n` : `${POISON}\n`) : undefined;
const absent = (dest: string) => (notScanned(dest) ? null : undefined);
/** Only the app-root files: the shipped docs and script left out. */
const rootFilesOnly = (dest: string) => (NOT_KIT.some((entry) => entry.dest === dest) ? null : undefined);

describe("an app's Tailwind scans the kit and nothing else a release ships (spec §8.4)", () => {
  it("the template scans the vendor folder and excludes the docs, the sync script, the config and the lock", () => {
    expect(TEMPLATE).toContain('@source "../vendor/ops-ui";');
    expect(TEMPLATE).toContain('@source not "../vendor/ops-ui/*.md";');
    expect(TEMPLATE).toContain('@source not "../../scripts/sync-ops-ui.*";');
    expect(TEMPLATE).toContain('@source not "../../ops-ui.config.json";');
    expect(TEMPLATE).toContain('@source not "../../ops-ui.lock.json";');
    // The config is the spec's, and names an extension nothing in the test app uses.
    expect(JSON.parse(CONFIG).extensions).toContain("--color-sick-subtle");
    // The files the exclusions stand for: the three docs in the vendor folder, and the script with
    // its declarations under scripts/. A new kind of shipped file needs its own line.
    expect(NOT_KIT.map(({ dest }) => dest).sort()).toEqual([
      "scripts/sync-ops-ui.d.mts",
      "scripts/sync-ops-ui.mjs",
      `${VENDOR}/CHANGELOG.md`,
      `${VENDOR}/DESIGN.md`,
      `${VENDOR}/TOKENS.md`,
    ]);
  });

  it(
    "whatever the docs, the sync script, the config and the lock say, the app's CSS is the same",
    async () => {
      const clean = await compile(app("absent", TEMPLATE, absent));
      // The kit is scanned: a class only its code uses is generated.
      expect(clean).toMatch(/\.rounded-control\s*\{/);
      expect(await compile(app("shipped", TEMPLATE))).toBe(clean);
      expect(await compile(app("poisoned", TEMPLATE, poisoned))).toBe(clean);
    },
    120_000,
  );

  it(
    "without the exclusions the same files would reach the CSS (so the test can fail)",
    async () => {
      const bare = TEMPLATE.split("\n").filter((line) => !line.startsWith("@source not ")).join("\n");
      const clean = await compile(app("bare-absent", bare, absent));
      const leaked = await compile(app("bare-poisoned", bare, poisoned));
      expect(leaked).not.toBe(clean);
      expect(leaked).toMatch(/--color-sick-subtle:/);
      expect(clean).not.toMatch(/--color-sick-subtle:/);
      // And the shipped TOKENS.md alone is enough: it names --color-sick-subtle.
      expect(await compile(app("bare-shipped", bare, (dest) => (ROOT_FILES.includes(dest) ? null : undefined)))).toMatch(/--color-sick-subtle:/);
    },
    120_000,
  );

  it(
    "without the config and lock lines the spec's own §3.3 config reaches the CSS, and so would a lock",
    async () => {
      const noRoot = TEMPLATE.split("\n")
        .filter((line) => !/^@source not "\.\.\/\.\.\/ops-ui\.(config|lock)\.json";$/.test(line))
        .join("\n");
      expect(noRoot.split("\n").length).toBe(TEMPLATE.split("\n").length - 2);
      const clean = await compile(app("noroot-absent", noRoot, absent));
      expect(clean).not.toMatch(/--color-sick-subtle:/);
      // The config as the spec writes it (extensions: --color-sick-subtle), the docs left out.
      expect(await compile(app("noroot-config", noRoot, (dest) => (dest === "ops-ui.lock.json" ? null : rootFilesOnly(dest))))).toMatch(
        /--color-sick-subtle:/,
      );
      // A lock is JSON at the root too: whatever it names reaches the CSS.
      const lockOnly = (dest: string) =>
        dest === "ops-ui.config.json" ? null : dest === "ops-ui.lock.json" ? `${JSON.stringify({ poison: POISON.split(" ") })}\n` : rootFilesOnly(dest);
      expect(await compile(app("noroot-lock", noRoot, lockOnly))).toMatch(/--color-sick-subtle:/);
      // With the template's lines, the same two files change nothing.
      expect(await compile(app("root-config", TEMPLATE, rootFilesOnly))).toBe(await compile(app("root-absent", TEMPLATE, absent)));
    },
    120_000,
  );
});
