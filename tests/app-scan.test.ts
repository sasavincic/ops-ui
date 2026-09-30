import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { shipPlan } from "../sync/sync-ops-ui.mjs";
import { ROOT, readSource } from "./source-files";

// What an app's Tailwind scans (spec §8.4). A release ships more than the kit's code into the
// app tree: DESIGN.md, TOKENS.md and CHANGELOG.md in the vendor folder, and the sync script under
// scripts/. Tailwind emits a class, or a theme variable, for any name it finds in a scanned file
// (TOKENS.md names --color-sick-subtle, which Workforce Ops declares and never uses; the CHANGELOG
// names bg-primary/10; the sync script names --color-tool), and it scans those files twice over:
// through @source "../vendor/ops-ui" and through automatic detection (none of them is ignored).
// So without the template's two `@source not` lines a docs-only release would change an app's CSS
// and its G3 token dump. This test builds an app from the §8.4 template and ship.json, compiles it
// with the pinned Tailwind, and requires the CSS to be the same whatever those files say.

const require = createRequire(import.meta.url);
const tailwind = require("@tailwindcss/postcss") as (options: { base: string; optimize: boolean }) => unknown;
const postcss = createRequire(require.resolve("@tailwindcss/postcss"))("postcss") as (plugins: unknown[]) => {
  process: (css: string, options: { from: string }) => Promise<{ css: string }>;
};

const SPEC = readSource("docs/superpowers/specs/2026-09-30-ops-ui-library.md");

/** The fenced css block of the spec whose first line starts with `firstLine`. */
function specBlock(firstLine: string): string {
  const start = SPEC.indexOf("```css\n" + firstLine);
  expect(start, `the spec has a css block starting ${firstLine}`).toBeGreaterThan(-1);
  const body = start + "```css\n".length;
  return SPEC.slice(body, SPEC.indexOf("```", body));
}

const TEMPLATE = specBlock("/* src/app/globals.css");
const BRAND = specBlock("/* Workforce Ops brand");
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

/** An app tree from the template, with the shipped files (`override` replaces some contents). */
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
  // `@import "tailwindcss"` resolves from the app; automatic detection never scans node_modules.
  symlinkSync(path.join(ROOT, "node_modules"), path.join(root, "node_modules"), "dir");
  return root;
}

async function compile(root: string) {
  const from = path.join(root, "src/app/globals.css");
  const result = await postcss([tailwind({ base: root, optimize: false })]).process(readFileSync(from, "utf8"), { from });
  return result.css;
}

const poisoned = (dest: string) => (NOT_KIT.some((entry) => entry.dest === dest) ? `${POISON}\n` : undefined);
const absent = (dest: string) => (NOT_KIT.some((entry) => entry.dest === dest) ? null : undefined);

describe("an app's Tailwind scans the kit and nothing else a release ships (spec §8.4)", () => {
  it("the template scans the vendor folder and excludes the docs and the sync script", () => {
    expect(TEMPLATE).toContain('@source "../vendor/ops-ui";');
    expect(TEMPLATE).toContain('@source not "../vendor/ops-ui/*.md";');
    expect(TEMPLATE).toContain('@source not "../../scripts/sync-ops-ui.*";');
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
    "whatever the docs and the sync script say, the app's CSS is the same",
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
    "without the two exclusions the same files would reach the CSS (so the test can fail)",
    async () => {
      const bare = TEMPLATE.split("\n").filter((line) => !line.startsWith("@source not ")).join("\n");
      const clean = await compile(app("bare-absent", bare, absent));
      const leaked = await compile(app("bare-poisoned", bare, poisoned));
      expect(leaked).not.toBe(clean);
      expect(leaked).toMatch(/--color-sick-subtle:/);
      expect(clean).not.toMatch(/--color-sick-subtle:/);
      // And the shipped TOKENS.md alone is enough: it names --color-sick-subtle.
      expect(await compile(app("bare-shipped", bare))).toMatch(/--color-sick-subtle:/);
    },
    120_000,
  );
});
