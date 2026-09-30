import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  EXCERPT_MODULES,
  FINAOPS_AHEAD,
  LIBRARY_CHANGES,
  ROWS,
  WFO_AHEAD,
  WHOLE_MODULES,
  account,
  diffLines,
  newTally,
  readTypesModule,
  relocateTypes,
  run,
  stringLeaves,
  substitute,
} from "../tools/diff-against-app.mjs";
import { ROOT, readSource } from "./source-files";

// tools/diff-against-app.mjs (spec §12.1 L6): the extraction proof. The unit tests pin each
// normalization to what the spec calls mechanical; the end-to-end tests run the tool against an
// app tree rebuilt from the library's own L2 import commit (the FinaOps kit byte for byte and the
// Workforce Ops modules), so the proof is exercised without an app checkout - and a planted change
// must fail it.

const EN = stringLeaves(readSource("src/config/strings.ts"), "strings.ts", "EN_STRINGS");

describe("normalizations", () => {
  it("t.common.x → strings.x, file-wide (comments too), and the hook line becomes one marker", () => {
    const tally = newTally();
    const app = [
      "  const t = useDict();",
      "  const locale = useLocale();",
      "  return <b title={t.common.pickMonth}>{t.common.datePicker.today}</b>; // pass t.common.open",
    ].join("\n");
    const lib = ["  const { strings, locale } = useOpsUi();", "  return <b title={strings.pickMonth}>{strings.datePicker.today}</b>; // pass strings.open"].join("\n");
    expect(substitute(app, "app", EN, tally)).toBe(substitute(lib, "lib", EN, newTally()));
    expect(tally.hooks).toBe(2);
    expect(tally.commonToStrings).toBe(3);
  });

  it("the null-dictionary fallback folds only when its literal IS the English word", () => {
    const tally = newTally();
    expect(substitute(`const dict = useMaybeDict();\nconst a = dict?.common.close ?? "Close";`, "app", EN, tally)).toContain("const a = strings.close;");
    expect(substitute(`const dict = useMaybeDict();\nconst a = dict?.common.close ?? "Shut";`, "app", EN, newTally())).toContain('dict?.common.close ?? "Shut"');
    expect(tally.nullDictFallback).toBe(1);
  });

  it("localizeMessage(t, s) and its null-dictionary branch become localize(s)", () => {
    const out = substitute(
      `const t = useMaybeDict();\nconst a = t ? localizeMessage(t, error) : error;\nconst b = localizeMessage(t, text);`,
      "app",
      EN,
      newTally(),
    );
    expect(out).toContain("const a = localize(error);");
    expect(out).toContain("const b = localize(text);");
  });

  it("a type moves to types.ts only when the app's definition is proven to be the library's", () => {
    const types = readTypesModule(`export type Tone = "a" | "b";\nexport type Name = "x" | "y";`);
    const lib = `import type { Tone, Name } from "../types";\nexport type { Tone };\nexport type { Name };\nconst paths: Record<Name, string> = { x: "1", y: "2" };\n`;
    const good = `export type Tone = "a" | "b";\nconst paths = { x: "1", y: "2" } as const;\nexport type Name = keyof typeof paths;\n`;
    const moved = relocateTypes(good, lib, "f.tsx", types, newTally());
    expect(moved.problems).toEqual([]);
    expect(moved.appText).not.toMatch(/export type/);
    expect(moved.libText).not.toMatch(/export type \{/);

    const bad = `export type Tone = "a" | "c";\nconst paths = { y: "2", x: "1" } as const;\nexport type Name = keyof typeof paths;\n`;
    const refused = relocateTypes(bad, lib, "f.tsx", types, newTally());
    expect(refused.problems.join("\n")).toMatch(/Tone: the app's definition/);
    expect(refused.problems.join("\n")).toMatch(/Name: the app's definition/);
    expect(refused.libText).toMatch(/export type \{ Tone \}/);
  });

  it("every changed line needs a named row; anything else is unexplained", () => {
    const ops = diffLines(["a", '? "border-accent/50 bg-accent/10 text-accent"', "c"], ["a", '? "border-external/50 bg-external/10 text-external"', "c", "d"]);
    const acc = account("monogram.tsx", ops, "finaops", null);
    expect(acc.missing.join("\n")).toMatch(/expected change not found/);
    expect(acc.unexplained.added).toContain("d");
  });
});

describe("the tables", () => {
  const components = execFileSync("git", ["-C", ROOT, "ls-files", "src/components"], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .map((f) => path.basename(f));

  it("§9 lists exactly the library's 35 components, with their directives", () => {
    expect(Object.keys(ROWS).sort()).toEqual(components.sort());
    expect(Object.values(ROWS).map((r) => r.row).sort((a, b) => a - b)).toEqual(Array.from({ length: 35 }, (_, i) => i + 1));
    for (const [file, row] of Object.entries(ROWS)) {
      expect(readSource(`src/components/${file}`).startsWith('"use client";'), file).toBe(row.kind === "C");
    }
  });

  it("library changes and named drift point at real components; the named drift waits for a decision", () => {
    for (const file of [...Object.keys(LIBRARY_CHANGES), ...Object.keys(WFO_AHEAD), ...Object.keys(FINAOPS_AHEAD)]) expect(components).toContain(file);
    for (const entry of [...Object.values(WFO_AHEAD), ...Object.values(FINAOPS_AHEAD)]) expect(entry.ref).toMatch(/§12\.4/);
  });

  it("each FinaOps-ahead entry names library lines the library really holds (or it could never match)", () => {
    for (const [file, entry] of Object.entries(FINAOPS_AHEAD)) {
      const lib = readSource(`src/components/${file}`).split("\n").map((l) => l.trim());
      for (const line of entry.libraryOnly) expect(lib, `${file}: ${line}`).toContain(line);
      for (const line of entry.appOnly) expect(lib, `${file}: ${line}`).not.toContain(line);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// End to end, against the L2 import
// ---------------------------------------------------------------------------------------------

const SANDBOX = mkdtempSync(path.join(os.tmpdir(), "ops-ui-diff-test-"));
afterAll(() => rmSync(SANDBOX, { recursive: true, force: true }));

const L2 = execFileSync("git", ["-C", ROOT, "log", "--format=%H", "--grep=^L2: import the kit"], { encoding: "utf8" }).trim().split("\n")[0];
const atL2 = (p: string) => execFileSync("git", ["-C", ROOT, "show", `${L2}:${p}`], { encoding: "utf8" });

/** An app tree as the kit was imported: FinaOps' kit files and the modules at their app paths. */
function appFromL2(dir: string, name: "fina-ops" | "workforce-ops") {
  const put = (p: string, text: string) => {
    mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
    writeFileSync(path.join(dir, p), text);
  };
  put("package.json", JSON.stringify({ name }));
  const files = execFileSync("git", ["-C", ROOT, "ls-tree", "--name-only", `${L2}:src/components`], { encoding: "utf8" }).split("\n").filter(Boolean);
  for (const f of files) put(`src/components/ui/${f}`, atL2(`src/components/${f}`));
  for (const m of WHOLE_MODULES) put(m.app, atL2(`src/${m.lib}`));
  for (const m of EXCERPT_MODULES) {
    const app = typeof m.app === "string" ? m.app : m.app[name === "fina-ops" ? "finaops" : "workforce"];
    // The excerpt files open with their provenance line; the app module never had it.
    put(app, atL2(`src/${m.lib}`).replace(/^\/\/ L2 import: [^\n]*\n/, ""));
  }
  const common: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(EN)) {
    const [a, b] = k.split(".");
    if (b) common[a] = { ...(common[a] as object), [b]: v };
    else common[a] = v;
  }
  put("src/i18n/dictionaries/en/common.ts", `export const common = ${JSON.stringify(common, null, 2)};\n`);
  return {
    edit: (p: string, fn: (s: string) => string) => put(p, fn(readFileSync(path.join(dir, p), "utf8"))),
  };
}

// The end-to-end proof reads the L2 import commit. In a shallow clone it is missing: that must be
// red, never a silently skipped proof (the gates need full history).
it("the L2 import commit is in history (a shallow clone: git fetch --unshallow)", () => {
  expect(L2, "no commit titled 'L2: import the kit' - the extraction proof cannot run").toMatch(/^[0-9a-f]{40}$/);
});

describe.skipIf(!L2)("end to end", () => {
  const T = { timeout: 60_000 };

  it("the library is proven against the kit it was imported from", T, () => {
    const dir = path.join(SANDBOX, "fina-ops");
    appFromL2(dir, "fina-ops");
    const res = run({ app: dir });
    expect(res.lines.at(-1)).toMatch(/^Verdict: PROVEN against FinaOps: 30 components identical after normalization, 5 differing only by named spec rows$/);
    expect(res.ok).toBe(true);
  });

  it("FinaOps' kit moving after the 1.0 source commit is named drift, never passed silently (spec §12.4)", T, () => {
    // b775fb6 (FinaOps, 2026-09-30 20:47): AdminIconButton's deactivate / reactivate glyphs.
    const b775fb6 = (s: string) =>
      s
        .replace('icon?: "edit" | "delete" | "unlock" | "permissions" | "key";', 'icon?: "edit" | "delete" | "unlock" | "permissions" | "key" | "deactivate" | "reactivate";')
        .replace(
          '    key: "M10 9a3.5 3.5 0 1 0-3-3L1.5 11.5v3h3v-2h2v-2z",\n',
          '    key: "M10 9a3.5 3.5 0 1 0-3-3L1.5 11.5v3h3v-2h2v-2z",\n' +
            "    // An account that can't sign in: the circle crossed out.\n" +
            '    deactivate: "M14.5 8a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0M3.4 3.4l9.2 9.2",\n' +
            '    reactivate: "M2 6h7a4 4 0 0 1 0 8H6M5 3 2 6l3 3",\n',
        );
    const dir = path.join(SANDBOX, "fina-ops-ahead");
    const app = appFromL2(dir, "fina-ops");
    app.edit("src/components/ui/button.tsx", b775fb6);
    const res = run({ app: dir });
    const text = res.lines.join("\n");
    expect(res.ok).toBe(false);
    expect(text).toMatch(/ 5 {2}button\.tsx +FinaOps ahead \(spec §12\.4 L6 review, RE-IMPORT PENDING\)/);
    expect(text).toMatch(/FAIL FinaOps ahead/);
    expect(text).not.toMatch(/not at this ref/);
    expect(res.lines.at(-1)).toMatch(/^Verdict: EXTRACTION PROVEN against FinaOps \(29 components identical .*\), but FinaOps is ahead of the 1\.0 source in button\.tsx: .*re-import them before L7b\.$/);

    // Half of the change, or the change plus one more line, is not the named drift.
    const partial = path.join(SANDBOX, "fina-ops-ahead-partial");
    appFromL2(partial, "fina-ops").edit("src/components/ui/button.tsx", (s) => b775fb6(s).replace(/ *reactivate: [^\n]*\n/, ""));
    const partialRes = run({ app: partial });
    expect(partialRes.lines.join("\n")).toMatch(/ 5 {2}button\.tsx +UNEXPLAINED/);
    expect(partialRes.lines.at(-1)).toMatch(/^Verdict: NOT PROVEN against FinaOps/);

    // The 1.0 source itself: proven, with the named drift listed as not at this ref.
    const source = path.join(SANDBOX, "fina-ops-at-l2");
    appFromL2(source, "fina-ops");
    const base = run({ app: source });
    expect(base.ok).toBe(true);
    expect(base.lines.join("\n")).toMatch(/FinaOps ahead of the 1\.0 source, but not at this ref \(spec §12\.4\): the proof holds for this ref only\n {2}button\.tsx: b775fb6/);
  });

  it("a planted change fails the proof and names the line", T, () => {
    const dir = path.join(SANDBOX, "fina-ops-planted");
    const app = appFromL2(dir, "fina-ops");
    app.edit("src/components/ui/card.tsx", (s) => s.replace("rounded-container", "rounded-full"));
    app.edit("src/lib/utils.ts", (s) => s.replace('"micro"', '"tiny"'));
    const res = run({ app: dir });
    const text = res.lines.join("\n");
    expect(res.ok).toBe(false);
    expect(text).toMatch(/ 7 {2}card\.tsx +UNEXPLAINED/);
    expect(text).toMatch(/twMerge: FAIL differs/);
    expect(res.lines.at(-1)).toMatch(/^Verdict: NOT PROVEN against FinaOps: 2 unaccounted/);
  });

  it("against Workforce Ops a FinaOps-side row passes and an unnamed kit change is reported as drift", T, () => {
    const fina = path.join(SANDBOX, "wfo-case", "fina-ops");
    appFromL2(fina, "fina-ops");
    const dir = path.join(SANDBOX, "wfo-case", "workforce-ops");
    const app = appFromL2(dir, "workforce-ops");
    // §9 row 26: Workforce Ops has the Segmented without FinaOps' overflow handling.
    app.edit("src/components/ui/segmented.tsx", (s) =>
      s.replace(/ *\/\/ Never wider than its row[^\n]*\n/, "").replace("w-fit max-w-full shrink-0", "w-fit shrink-0").replace(" overflow-x-auto rounded-control", " rounded-control"),
    );
    // A kit change §9 does not know of.
    app.edit("src/components/ui/kicker.tsx", (s) => `${s}\nexport const EXTRA = 1;\n`);
    // Workforce Ops' shiftMonth is written as one expression (§7 row 12): same behaviour.
    app.edit("src/domain/hours-periods.ts", (s) =>
      s.replace(/const d = new Date\(([^;]*)\);\n\s*return d\.toISOString\(\)/, "return new Date($1).toISOString()"),
    );
    const res = run({ app: dir, source: fina });
    const text = res.lines.join("\n");
    expect(text).toMatch(/26 {2}segmented\.tsx +FinaOps-side \(§9 row 26\)/);
    expect(text).toMatch(/18 {2}kicker\.tsx +WORKFORCE OPS AHEAD \(not named in the spec\)/);
    expect(text).toMatch(/shiftMonth: written differently; same output on 44,676 inputs/);
    expect(text).toMatch(/34 {2}search-form\.tsx +identical/);
    expect(res.ok).toBe(false);
    expect(res.lines.at(-1)).toMatch(/^Verdict: EXTRACTION PROVEN against Workforce Ops .* ahead of the 1\.0 source in kicker\.tsx/);
  });
});
