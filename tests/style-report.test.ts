import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  blankTsxComments,
  classRecipes,
  emptyStyleAllowlist,
  formatStyleReport,
  parseStyleAllowlist,
  readStyleAllowlist,
  styleFindings,
  styleReport,
} from "../sync/sync-ops-ui.mjs";
import { ROOT } from "./source-files";

// The style guards (styling programme spec §5, library 1.2.0): pure exports of the sync script
// that each app's tests/style-guards.test.ts calls, and the --style-report command. Fixture
// apps are written into temporary folders.

const SANDBOX = mkdtempSync(path.join(os.tmpdir(), "ops-ui-style-"));
afterAll(() => rmSync(SANDBOX, { recursive: true, force: true }));

let n = 0;
/** Writes a fixture app ({ "src/x.tsx": "…" }) and returns its root. */
function app(files: Record<string, string>): string {
  const root = path.join(SANDBOX, `app${n++}`);
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), content);
  }
  return root;
}

const kinds = (source: string, file = "src/components/x.tsx", allowlist = emptyStyleAllowlist()) =>
  styleFindings(source, file, { allowlist }).map((f) => `${f.kind} ${f.line} ${f.text}`);

describe("styleFindings", () => {
  it("colour literals: hex and colour functions in code, never in comments or entities", () => {
    const source = [
      'const a = "#0b131e";', // 1
      '<div className="bg-[#fff]" />', // 2
      'const b = "rgb(0 0 0)"; const c = `oklch(0.5 0.1 250)`;', // 3
      "// #abcdef in a comment", // 4
      "/* rgba(0,0,0,.5) */", // 5
      "<span>&#x2715; &#160; issue #12 and #page-top</span>", // 6
      'const d = "hsla(1,2%,3%,.4)";', // 7
    ].join("\n");
    expect(kinds(source).filter((k) => k.startsWith("colour"))).toEqual([
      "colour 1 #0b131e",
      "colour 2 #fff",
      "colour 3 rgb(",
      "colour 3 oklch(",
      "colour 7 hsla(",
    ]);
    expect(kinds(source, "src/app/icon.tsx", parseStyleAllowlist({ colours: [{ value: "src/app/icon.tsx", reason: "icon generator" }] })).filter((k) => k.startsWith("colour"))).toEqual([]);
  });

  it("arbitrary values: listed tokens pass, with or without variant prefixes", () => {
    const source = [
      '<div className="w-[37px] max-h-[calc(100dvh-2.5rem)] sm:max-h-[calc(100dvh-2.5rem)]" />',
      '<div className="lg:grid-cols-[1fr_minmax(20rem,26rem)] bg-primary/10 w-(--w) -mt-[3px]" />',
      "const x = list[0]; const y = a - [1, 2].length;",
    ].join("\n");
    expect(kinds(source).filter((k) => k.startsWith("arbitrary"))).toEqual([
      "arbitrary 1 w-[37px]",
      "arbitrary 1 max-h-[calc(100dvh-2.5rem)]",
      "arbitrary 1 sm:max-h-[calc(100dvh-2.5rem)]",
      "arbitrary 2 lg:grid-cols-[1fr_minmax(20rem,26rem)]",
      "arbitrary 2 -mt-[3px]",
    ]);
    const allowlist = parseStyleAllowlist({
      arbitrary: [
        { value: "max-h-[calc(100dvh-2.5rem)]", reason: "dialog height under the browser chrome" },
        { value: "lg:grid-cols-[1fr_minmax(20rem,26rem)]", reason: "the record + rail layout" },
      ],
    });
    expect(kinds(source, "src/x.tsx", allowlist).filter((k) => k.startsWith("arbitrary"))).toEqual([
      "arbitrary 1 w-[37px]",
      "arbitrary 2 -mt-[3px]",
    ]);
  });

  it("style={{ }}: a runtime: reason or CSS variables only", () => {
    const source = [
      "<div style={{ width: 10 }} />", // 1
      "<div style={{ width: `${pct}%` }} /> {/* runtime: progress */}", // 2
      '<div style={{ "--w": `${pct}%` } as React.CSSProperties} />', // 3
      "<div style={{ '--x': x, \"--y\": y }} />", // 4
      '<div style={{ "--w": w, height: h }} />', // 5
      "<div style={{ ...rest }} />", // 6
      "<div style={styles} />", // 7
      "<div\n  style={{\n    transform: t,\n  }}\n/>", // 8-12
    ].join("\n");
    expect(kinds(source).filter((k) => k.startsWith("style"))).toEqual([
      "style 1 <div style={{ width: 10 }} />",
      'style 5 <div style={{ "--w": w, height: h }} />',
      "style 6 <div style={{ ...rest }} />",
      "style 9 style={{",
    ]);
    const allowed = parseStyleAllowlist({ styles: [{ value: "src/components/wall/", reason: "the wall's canvas geometry" }] });
    expect(kinds(source, "src/components/wall/board.tsx", allowed).filter((k) => k.startsWith("style"))).toEqual([]);
  });

  it("raw controls: outside the kit folders and the listed specials only", () => {
    const source = '<button onClick={go}>x</button>\n<select name="a" />\n<input type="text"/>\n<table>\n<buttonish />\n<Button />';
    expect(kinds(source).filter((k) => k.startsWith("raw-control"))).toEqual([
      "raw-control 1 <button>",
      "raw-control 2 <select>",
      "raw-control 3 <input>",
      "raw-control 4 <table>",
    ]);
    expect(kinds(source, "src/components/ui/button.tsx")).toEqual([]);
    expect(kinds(source, "src/vendor/ops-ui/components/table.tsx")).toEqual([]);
    const allowed = parseStyleAllowlist({ rawControls: [{ value: "src/components/operations", reason: "the gap grid" }] });
    expect(kinds(source, "src/components/operations/gap-grid.tsx", allowed)).toEqual([]);
    expect(kinds(source, "src/components/operationsx/a.tsx", allowed).length).toBe(4);
  });

  it("comments are blanked; strings and lines are kept; an apostrophe in JSX text swallows nothing", () => {
    const source = "a // b\n/* c\nd */ e\n<p>don't</p>\n<div className=\"bg-[#fff]\" />\nconst u = \"https://x\";";
    const blanked = blankTsxComments(source);
    expect(blanked.split("\n")).toHaveLength(source.split("\n").length);
    expect(blanked).not.toContain("// b");
    expect(blanked).not.toContain("c\nd");
    expect(blanked).toContain('"https://x"');
    expect(kinds(source)).toEqual(["colour 5 #fff", "arbitrary 5 bg-[#fff]"]);
  });
});

describe("classRecipes", () => {
  it("reads the literal forms as sorted class sets", () => {
    const source = [
      '<p className="text-ink-secondary text-detail" />',
      "<p className={'text-detail text-ink-secondary'} />",
      '<p className={"text-detail  text-ink-secondary"} />',
      "<p className={`gap-2 flex`} />",
      "<p className={`gap-${n}`} />",
      '<p className={cn("flex  gap-2", x)} />',
      '// <p className="ignored" />',
    ].join("\n");
    expect(classRecipes(source)).toEqual([
      "text-detail text-ink-secondary",
      "text-detail text-ink-secondary",
      "text-detail text-ink-secondary",
      "flex gap-2",
      "flex gap-2",
    ]);
  });
});

describe("the allow-list file", () => {
  it("a missing file is empty; entries need a value and a reason; unknown keys are refused", () => {
    expect(readStyleAllowlist(app({ "src/a.tsx": "" }))).toEqual(emptyStyleAllowlist());
    expect(() => parseStyleAllowlist([])).toThrow(/expected an object/);
    expect(() => parseStyleAllowlist({ arbitrary: [{ value: "w-[1px]" }] })).toThrow(/needs a reason/);
    expect(() => parseStyleAllowlist({ arbitrary: [{ value: "", reason: "x" }] })).toThrow(/needs a value/);
    expect(() => parseStyleAllowlist({ colors: [] })).toThrow(/unknown key "colors"/);
    const root = app({ "style-allowlist.json": "{ not json" });
    expect(() => readStyleAllowlist(root)).toThrow(/not valid JSON/);
  });
});

describe("styleReport", () => {
  const root = app({
    "src/app/page.tsx": [
      '<p className="text-detail text-ink-secondary" />',
      '<p className="text-ink-secondary text-detail" />',
      '<div className="flex flex-col gap-4" />',
      '<div className="w-[37px]" style={{ width: 1 }} />',
      "<button />",
    ].join("\n"),
    "src/components/ui/button.tsx": '<button className="flex flex-col gap-4" />',
    "src/components/wall/board.tsx": '<div className="max-h-[calc(100dvh-2.5rem)]" style={{ left: x }} />',
    "src/vendor/ops-ui/components/x.tsx": '<div className="w-[1px] text-detail text-ink-secondary" style={{ a: 1 }} />\n<button />',
    "src/lib/util.ts": 'const x = "#fff";',
    "style-allowlist.json": JSON.stringify({
      arbitrary: [
        { value: "max-h-[calc(100dvh-2.5rem)]", reason: "dialog height" },
        { value: "h-[13px]", reason: "gone" },
      ],
      styles: [{ value: "src/components/wall/", reason: "canvas geometry" }],
      rawControls: [{ value: "src/components/grid/", reason: "gone too" }],
    }),
  });

  it("scans src/**/*.tsx minus the vendor folder, counts per kind, stale entries, top recipes", () => {
    const report = styleReport(root);
    expect(report.files).toBe(3);
    expect(report.counts).toEqual({ colour: 0, arbitrary: 1, style: 1, "raw-control": 1 });
    expect(report.findings.map((f) => `${f.file}:${f.line} ${f.kind}`)).toEqual([
      "src/app/page.tsx:4 arbitrary",
      "src/app/page.tsx:4 style",
      "src/app/page.tsx:5 raw-control",
    ]);
    expect(report.stale).toEqual({
      arbitrary: [{ value: "h-[13px]", reason: "gone" }],
      colours: [],
      styles: [],
      rawControls: [{ value: "src/components/grid/", reason: "gone too" }],
    });
    expect(report.recipes).toEqual([
      { classes: "flex flex-col gap-4", count: 2 },
      { classes: "text-detail text-ink-secondary", count: 2 },
    ]);
    expect(styleReport(root, { top: 1 }).recipes).toHaveLength(1);
    expect(styleReport(root, { exclude: [] }).files).toBe(4);
  });

  it("the printed report names every finding and the recipes", () => {
    const text = formatStyleReport(styleReport(root));
    expect(text).toContain("style report: 3 .tsx files under src (src/vendor/ skipped)");
    expect(text).toContain("arbitrary values not on the allow-list: 1 (1 distinct)");
    expect(text).toContain("  src/app/page.tsx:4  w-[37px]");
    expect(text).toContain("allow-list entries that match nothing (remove them): 2");
    expect(text).toContain("     2  flex flex-col gap-4");
  });

  it("--style-report prints it and exits 0; other commands are untouched", () => {
    const script = path.join(ROOT, "sync/sync-ops-ui.mjs");
    const run = (...args: string[]) => spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: "utf8" });
    const ok = run("--style-report", "--top", "1");
    expect(ok.status).toBe(0);
    expect(ok.stdout).toContain("most repeated class strings (top 1):");
    expect(run("--style-report", "--top").status).toBe(2);
    expect(run("--style-report", "--nope").status).toBe(2);
    const usage = run();
    expect(usage.status).toBe(2);
    expect(usage.stderr).not.toContain("style-report");
  });
});

describe("arbitrary tokens are read whole from the class strings", () => {
  it("nested brackets, arbitrary variants, template parts", () => {
    const source = [
      '<main className="has-[[data-page-full-width]]:max-w-none data-[state=open]:bg-surface p-2" />',
      "<div className={`top-[calc(4rem+env(safe-area-inset-top))] ${open ? \"w-[3px]\" : \"\"}`} />",
      '<p>Don\'t read [this]-[that]</p>',
    ].join("\n");
    expect(kinds(source).filter((k) => k.startsWith("arbitrary"))).toEqual([
      "arbitrary 1 has-[[data-page-full-width]]:max-w-none",
      "arbitrary 1 data-[state=open]:bg-surface",
      "arbitrary 2 top-[calc(4rem+env(safe-area-inset-top))]",
      "arbitrary 2 w-[3px]",
    ]);
  });
});
