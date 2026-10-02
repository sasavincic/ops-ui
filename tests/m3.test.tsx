import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Input } from "../src/components/field";
import { RowMenu, type RowMenuItem } from "../src/components/row-menu";
import { SearchInput } from "../src/components/search-input";
import { YearInput } from "../src/components/year-input";
import { EN_OPTIONAL_STRINGS, EN_STRINGS } from "../src/config/strings";
import { OpsUiProvider } from "../src/config/provider";
import { ReadOnlyScope } from "../src/config/read-only";
import {
  anchorYear,
  isYearString,
  maskTypedYear,
  parseTypedYear,
  yearKeyTarget,
  yearPageStart,
  yearWithin,
} from "../src/lib/year-input";
import { ROOT } from "./source-files";

// 1.4.0 (PrefabOps restyle plan M3): Input prefix / suffix (G10), YearInput (G13), RowMenu trigger +
// sections (G8). A minor: every call site without the new props renders exactly what 1.3.0 rendered,
// which these tests prove against the 1.3.0 release's own source (exported from git into a sandbox
// and rendered beside the current one); the gallery's baselines prove the pixels.

const html = (el: ReactElement) => renderToStaticMarkup(el);

const SANDBOX = mkdtempSync(path.join(os.tmpdir(), "ops-ui-m3-"));
afterAll(() => rmSync(SANDBOX, { recursive: true, force: true }));

type V130 = {
  Input: typeof Input;
  RowMenu: typeof RowMenu;
  SearchInput: typeof SearchInput;
  ReadOnlyScope: typeof ReadOnlyScope;
};
let v130: V130;

beforeAll(async () => {
  const hash = execFileSync("git", ["log", "--format=%H", "--grep=^release: v1.3.0$", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  expect(hash, "the release: v1.3.0 commit (full history needed)").toMatch(/^[0-9a-f]{40}$/);
  const dir = path.join(SANDBOX, "v130");
  mkdirSync(dir, { recursive: true });
  execFileSync("sh", ["-c", `git archive ${hash} src | tar -x -C ${JSON.stringify(dir)}`], { cwd: ROOT });
  symlinkSync(path.join(ROOT, "node_modules"), path.join(dir, "node_modules"), "dir");
  const load = (rel: string) => import(pathToFileURL(path.join(dir, "src", rel)).href);
  const [field, rowMenu, search, readOnly] = await Promise.all([
    load("components/field.tsx"),
    load("components/row-menu.tsx"),
    load("components/search-input.tsx"),
    load("config/read-only.tsx"),
  ]);
  v130 = { Input: field.Input, RowMenu: rowMenu.RowMenu, SearchInput: search.SearchInput, ReadOnlyScope: readOnly.ReadOnlyScope };
}, 60_000);

describe("Input prefix / suffix (G10)", () => {
  const unchanged: [string, React.ComponentProps<typeof Input>][] = [
    ["no props", {}],
    ["value, id, className", { id: "a", defaultValue: "4.5", className: "w-32 text-right" }],
    ['size="lg"', { size: "lg" }],
    ["size as the HTML attribute", { size: 6 }],
    ["disabled, aria", { disabled: true, "aria-invalid": true, "aria-describedby": "hint" }],
    ["style", { style: { width: 120 } }],
    ['an empty prefix and suffix ("")', { prefix: "", suffix: "" }],
  ];
  it.each(unchanged)("without an adornment renders the 1.3.0 markup: %s", (_, props) => {
    const { prefix, suffix, wrapperClassName, ...rest } = props;
    expect(prefix ?? "").toBe("");
    expect(suffix ?? "").toBe("");
    expect(wrapperClassName).toBeUndefined();
    const OldInput = v130.Input as unknown as (p: object) => ReactElement;
    expect(html(<Input {...props} />)).toBe(html(<OldInput {...rest} />));
  });

  it("in a read-only scope, and SearchInput (built on Input), render the 1.3.0 markup", () => {
    const OldScope = v130.ReadOnlyScope;
    const OldInput = v130.Input;
    expect(html(<ReadOnlyScope readOnly><Input defaultValue="x" /></ReadOnlyScope>)).toBe(
      html(<OldScope readOnly><OldInput defaultValue="x" /></OldScope>),
    );
    const OldSearch = v130.SearchInput;
    expect(html(<SearchInput placeholder="Search name" wrapperClassName="w-64" />)).toBe(
      html(<OldSearch placeholder="Search name" wrapperClassName="w-64" />),
    );
  });

  it("draws the adornments beside the input, hidden from the tree and joined to its description", () => {
    const out = html(<Input id="t" defaultValue="4.5" prefix="€" suffix="mm" aria-describedby="hint" wrapperClassName="w-40" className="text-right" />);
    // One wrapper (full width unless wrapperClassName says otherwise), the input first, then the
    // two adornments.
    expect(out).toMatch(/^<span class="relative block w-40"><input /);
    expect(html(<Input suffix="mm" />)).toMatch(/^<span class="relative block w-full"><input /);
    const input = out.match(/<input [^>]*>/)![0];
    const describedBy = input.match(/aria-describedby="([^"]*)"/)![1].split(" ");
    expect(describedBy[0]).toBe("hint");
    expect(describedBy).toHaveLength(3);
    const spans = [...out.matchAll(/<span id="([^"]+)" aria-hidden="true" data-ops-adornment="(prefix|suffix)" class="([^"]*)">([^<]*)<\/span>/g)];
    expect(spans.map((m) => [m[2], m[4]])).toEqual([
      ["prefix", "€"],
      ["suffix", "mm"],
    ]);
    expect(spans.map((m) => m[1])).toEqual(describedBy.slice(1));
    for (const m of spans) expect(m[3]).toContain("pointer-events-none");
    expect(spans[0][3]).toContain("left-3");
    expect(spans[1][3]).toContain("right-3");
    // The text keeps clear of each adornment: before the first measurement (the server render)
    // by an estimate from its length; the browser measures it (behaviour test).
    expect(input).toContain("padding-left:calc(18px + 0.6em)");
    expect(input).toContain("padding-right:calc(18px + 1.2em)");
    // className still styles the input box itself.
    expect(input).toMatch(/class="[^"]*\btext-right\b/);
  });

  it("follows the field's size, keeps the input's own style, and stays read-only aware", () => {
    const lg = html(<Input size="lg" suffix="kg" style={{ width: 100 }} />);
    expect(lg).toMatch(/data-ops-adornment="suffix" class="[^"]*\btext-base\b/);
    expect(lg).not.toMatch(/data-ops-adornment="suffix" class="[^"]*lg:text-sm/);
    expect(lg).toMatch(/style="width:100px;padding-right:/);
    const md = html(<Input suffix="kg" />);
    expect(md).toMatch(/data-ops-adornment="suffix" class="[^"]*lg:text-sm/);
    expect(html(<ReadOnlyScope readOnly><Input suffix="kg" /></ReadOnlyScope>)).toMatch(/<input [^>]*disabled=""/);
    expect(html(<ReadOnlyScope readOnly><Input suffix="kg" readOnlySafe /></ReadOnlyScope>)).not.toMatch(/disabled=""/);
  });
});

const ITEMS: RowMenuItem[] = [
  { key: "edit", label: "Edit", icon: "edit", onClick: () => {} },
  { key: "delete", label: "Delete", icon: "delete", onClick: () => {}, danger: true },
];

describe("RowMenu trigger + sections (G8)", () => {
  it("without them renders the 1.3.0 markup (closed, and nothing when there are no items)", () => {
    const Old = v130.RowMenu;
    // 1.8.0: every kit button carries whitespace-nowrap (its label never wraps); nothing else moved.
    const now = (node: ReactElement) => html(node).replace(" whitespace-nowrap", "");
    expect(now(<RowMenu label="Actions: Passport" items={ITEMS} />)).toBe(html(<Old label="Actions: Passport" items={ITEMS} />));
    expect(now(<RowMenu label="x" items={ITEMS} className="ml-auto" />)).toBe(html(<Old label="x" items={ITEMS} className="ml-auto" />));
    expect(html(<RowMenu label="x" items={[]} />)).toBe("");
    const OldScope = v130.ReadOnlyScope;
    expect(now(<ReadOnlyScope readOnly><RowMenu label="x" items={ITEMS} /></ReadOnlyScope>)).toBe(
      html(<OldScope readOnly><Old label="x" items={ITEMS} /></OldScope>),
    );
  });

  it("the source keeps the 1.3.0 ⋯ trigger and item markup word for word", () => {
    const old = execFileSync("git", ["show", `${execFileSync("git", ["log", "--format=%H", "--grep=^release: v1.3.0$", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim()}:src/components/row-menu.tsx`], { cwd: ROOT, encoding: "utf8" });
    const now = execFileSync("cat", [path.join(ROOT, "src/components/row-menu.tsx")], { encoding: "utf8" });
    const squash = (s: string) => s.replace(/\s+/g, " ");
    // The menu list's classes, each item's two shapes, the ⋯ button's classes.
    // 1.8.0: the list became a top-layer popover; its 1.3 classes are all still there, beside the
    // popover's own (inset-auto m-0 overflow-visible text-ink backdrop:pointer-events-none).
    const listClasses = (src: string) => /role="menu"[\s\S]*?className="([^"]+)"/.exec(src)![1].split(" ");
    for (const token of listClasses(old)) expect(listClasses(now), token).toContain(token);
    for (const fragment of [
      // 1.7.0 wraps the link item's string in cn(…, TOUCH_FLOOR.height): the classes are the same.
      '"flex items-center gap-1.5 px-3 py-1.5 text-sm text-ink hover:bg-surface"',
      '"flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-sm hover:bg-surface disabled:opacity-50", item.danger ? "text-danger hover:bg-danger/10" : "text-ink"',
      'className={cn("px-2", TOUCH_FLOOR.width)}',
      '<ActionIcon name="more" always />',
    ]) {
      expect(squash(old), fragment).toContain(fragment);
      expect(squash(now), fragment).toContain(fragment);
    }
  });

  it("a trigger is a labelled button with a chevron: its label is its name, `label` its title", () => {
    const out = html(<RowMenu label="AI extraction tools" trigger={{ label: "AI tools", icon: "sparkle" }} items={ITEMS} />);
    const button = out.match(/<button [^>]*>/)![0];
    expect(button).toContain('title="AI extraction tools"');
    expect(button).not.toContain("aria-label");
    expect(button).toContain('aria-haspopup="menu"');
    expect(button).toContain('aria-expanded="false"');
    expect(button).toMatch(/class="[^"]*\bborder-border-strong\b/); // secondary by default
    expect(button).toMatch(/class="[^"]*\bh-8\b/); // sm by default, like the ⋯
    expect(out).toContain("AI tools");
    expect(out).toContain('<path d="m4 6 4 4 4-4"></path>');
    const ghostLg = html(<RowMenu label="x" trigger={{ label: "More", variant: "ghost", size: "lg", disabled: true }} items={ITEMS} />);
    expect(ghostLg).toMatch(/<button [^>]*class="[^"]*\bh-12\b[^"]*"[^>]*disabled=""/);
    expect(ghostLg).not.toContain("border-border-strong");
  });

  it("sections alone are enough; a menu with only empty sections renders nothing; a read-only scope hides a trigger", () => {
    expect(html(<RowMenu label="x" sections={[{ key: "a", heading: "Bulk", items: ITEMS }]} />)).toContain('aria-label="x"');
    expect(html(<RowMenu label="x" sections={[{ key: "a", heading: "Bulk", items: [] }]} />)).toBe("");
    expect(html(<RowMenu label="x" trigger={{ label: "AI tools" }} sections={[{ key: "a", items: [] }]} />)).toBe("");
    expect(html(<ReadOnlyScope readOnly><RowMenu label="x" trigger={{ label: "AI tools" }} items={ITEMS} /></ReadOnlyScope>)).not.toContain("<button");
  });
});

describe("YearInput (G13)", () => {
  it("the year rules: four digits, two read like DateInput's two-digit years, digits only", () => {
    expect(isYearString("2026")).toBe(true);
    expect(isYearString("0999")).toBe(false);
    expect(isYearString("26")).toBe(false);
    expect(parseTypedYear("2026", 2026)).toBe(2026);
    expect(parseTypedYear(" 1998 ", 2026)).toBe(1998);
    expect(parseTypedYear("26", 2026)).toBe(2026);
    expect(parseTypedYear("36", 2026)).toBe(2036);
    expect(parseTypedYear("37", 2026)).toBe(1937);
    expect(parseTypedYear("85", 2026)).toBe(1985);
    for (const bad of ["", "2", "202", "20266", "0999", "20a6", "26.", "-2026"]) expect(parseTypedYear(bad, 2026), bad).toBeNull();
    expect(maskTypedYear("2026.")).toBe("2026");
    expect(maskTypedYear("20 2 6 7")).toBe("2026");
    expect(maskTypedYear("abc")).toBe("");
  });

  it("the page of twelve is DateInput's (2016 – 2027 holds 2026), the anchor sits inside the limits", () => {
    expect(yearPageStart(2026)).toBe(2016);
    expect(yearPageStart(2016)).toBe(2016);
    expect(yearPageStart(2015)).toBe(2004);
    expect(yearPageStart(2027)).toBe(2016);
    expect(yearPageStart(2028)).toBe(2028);
    expect(yearWithin(2020, 2019, 2027)).toBe(true);
    expect(yearWithin(2018, 2019)).toBe(false);
    expect(yearWithin(2028, undefined, 2027)).toBe(false);
    expect(yearWithin(1, null, null)).toBe(true);
    expect(anchorYear(2010, 2026)).toBe(2010);
    expect(anchorYear(null, 2026)).toBe(2026);
    expect(anchorYear(null, 2026, 2030)).toBe(2030);
    expect(anchorYear(null, 2026, undefined, 2020)).toBe(2020);
  });

  it("the keyboard walk: a year, a row of three, a page of twelve (ten with Shift), the page's ends", () => {
    expect(yearKeyTarget("ArrowLeft", 2026)).toBe(2025);
    expect(yearKeyTarget("ArrowRight", 2026)).toBe(2027);
    expect(yearKeyTarget("ArrowUp", 2026)).toBe(2023);
    expect(yearKeyTarget("ArrowDown", 2026)).toBe(2029);
    expect(yearKeyTarget("PageUp", 2026)).toBe(2014);
    expect(yearKeyTarget("PageDown", 2026)).toBe(2038);
    expect(yearKeyTarget("PageUp", 2026, true)).toBe(1906);
    expect(yearKeyTarget("Home", 2026)).toBe(2016);
    expect(yearKeyTarget("End", 2026)).toBe(2027);
    expect(yearKeyTarget("Enter", 2026)).toBeNull();
  });

  it("renders the year, posts it under `name`, and speaks the default words", () => {
    const out = html(<YearInput id="y" name="manufactureYear" defaultValue="2024" />);
    expect(out).toMatch(/<input id="y" type="text" inputMode="numeric"[^>]*maxLength="4"[^>]*placeholder="YYYY"/);
    expect(out).toMatch(/role="combobox"/);
    expect(out).toMatch(/value="2024"/);
    expect(out).toContain('<input type="hidden" name="manufactureYear" value="2024"/>');
    expect(out).toContain(`aria-label="${EN_OPTIONAL_STRINGS.yearPicker.openPicker}"`);
    const empty = html(<YearInput value="" onChange={() => {}} />);
    expect(empty).toContain('<input type="hidden" value=""/>');
  });

  it("an app's words win; a year outside min / max marks the field; size, description, read-only", () => {
    const sl = html(
      <OpsUiProvider strings={{ ...EN_STRINGS, yearPicker: { placeholder: "LLLL", openPicker: "Izberi leto", thisYear: "Letos" } }}>
        <YearInput />
      </OpsUiProvider>,
    );
    expect(sl).toContain('placeholder="LLLL"');
    expect(sl).toContain('aria-label="Izberi leto"');
    const late = html(<YearInput value="2031" max={2027} onChange={() => {}} />);
    expect(late).toContain('aria-invalid="true"');
    expect(late).toContain(`title="${EN_STRINGS.datePicker.latest.replace("{date}", "2027")}"`);
    const early = html(<YearInput value="2001" min={2019} onChange={() => {}} />);
    expect(early).toContain(`title="${EN_STRINGS.datePicker.earliest.replace("{date}", "2019")}"`);
    expect(html(<YearInput value="2020" min={2019} max={2027} onChange={() => {}} />)).not.toContain('aria-invalid="');
    expect(html(<YearInput size="lg" />)).toMatch(/class="[^"]*\bh-12\b/);
    expect(html(<YearInput aria-describedby="hint" />)).toContain('aria-describedby="hint"');
    const locked = html(<ReadOnlyScope readOnly><YearInput defaultValue="2025" /></ReadOnlyScope>);
    expect(locked).toMatch(/<input [^>]*disabled=""/);
    expect(locked).not.toContain("Choose year"); // no picker button while it cannot change
    expect(html(<ReadOnlyScope readOnly><YearInput defaultValue="2025" readOnlySafe /></ReadOnlyScope>)).toContain("Choose year");
  });
});
