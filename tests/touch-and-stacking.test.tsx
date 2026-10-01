import { execFileSync } from "node:child_process";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { compile } from "tailwindcss";
import { describe, expect, it } from "vitest";
import { ActionIconScope } from "../src/components/action-icon";
import { Button, ButtonLink, IconButton } from "../src/components/button";
import { Combobox } from "../src/components/combobox";
import { DateInput } from "../src/components/date-input";
import { controlClasses, Input, Select, Textarea } from "../src/components/field";
import { RowMenu } from "../src/components/row-menu";
import { Segmented } from "../src/components/segmented";
import { ReadOnlyScope } from "../src/config/read-only";
import { cn } from "../src/lib/cn";
import { CONTROL_SIZE_CLASS, TOUCH_FLOOR } from "../src/lib/touch";
import { ROOT, readSource } from "./source-files";

// 1.3.0 (PrefabOps restyle plan M1 + M2): the opt-in touch floor, size="lg", IconButton and the
// stacking variables. A minor: an unchanged call site renders its 1.2 classes plus only the floor
// classes, which paint nothing unless an ancestor carries data-ops-touch AND the screen cannot
// hover (the gallery's 375-touch shots of every existing story prove the "nothing" part).

const FLOOR = [TOUCH_FLOOR.height, TOUCH_FLOOR.text];
const html = (el: ReactElement) => renderToStaticMarkup(el);
/** The class tokens of the first element matching `tag` in the markup. */
function classesOf(markup: string, tag: string): string[] {
  const m = markup.match(new RegExp(`<${tag}\\b[^>]*?class="([^"]*)"`));
  if (!m) throw new Error(`no <${tag} class> in ${markup}`);
  return m[1].split(/\s+/).filter(Boolean);
}
const sorted = (classes: string | string[]) => (Array.isArray(classes) ? classes : classes.split(/\s+/)).filter(Boolean).sort();

/** Tailwind's CSS for `candidates` with the kit's spacing and text steps. */
async function css(candidates: string[]): Promise<string> {
  const compiler = await compile(
    `@tailwind utilities;\n@theme { --spacing: 0.25rem; --text-sm: 0.875rem; --text-base: 1rem; --breakpoint-lg: 64rem; }`,
  );
  return compiler.build(candidates);
}

describe("the touch floor classes", () => {
  it("paint only under [data-ops-touch] on a screen that cannot hover and has a coarse pointer", async () => {
    const out = await css(Object.values(TOUCH_FLOOR));
    const media = out.match(/@media \(hover:none\) and \(pointer:coarse\) \{([\s\S]*)\n\}/);
    expect(media, out).not.toBeNull();
    // Everything the floor generates sits inside that one media block, behind the attribute.
    expect(out.slice(0, out.indexOf("@media"))).not.toMatch(/min-height|min-width|font-size/);
    const rules = [...media![1].matchAll(/^\s*(\S.*?) \{\s*([^}]*?)\s*\}/gm)].map((m) => [m[1], m[2]]);
    expect(rules).toHaveLength(3);
    for (const [selector] of rules) expect(selector.startsWith(":where([data-ops-touch]) .")).toBe(true);
    expect(rules.map(([, body]) => body).sort()).toEqual([
      "font-size: var(--text-base);",
      "min-height: calc(var(--spacing) * 11);",
      "min-width: calc(var(--spacing) * 11);",
    ]);
  });

  it("are ordered after lg:text-sm, so a coarse large screen keeps 16px inputs", async () => {
    const out = await css(["lg:text-sm", TOUCH_FLOOR.text]);
    expect(out.indexOf("lg\\:text-sm")).toBeLessThan(out.indexOf("in-data-ops-touch\\:text-base"));
  });
});

describe("Input, Select, Textarea", () => {
  it("an unchanged call site keeps its 1.2 classes and gains only the floor", () => {
    expect(sorted(classesOf(html(<Input />), "input"))).toEqual(sorted([...cn(controlClasses, "h-9").split(" "), ...FLOOR]));
    expect(sorted(classesOf(html(<Select />), "select"))).toEqual(sorted([...cn(controlClasses, "h-9").split(" "), ...FLOOR]));
    expect(sorted(classesOf(html(<Textarea />), "textarea"))).toEqual(
      sorted([...cn(controlClasses, "min-h-24 py-2").split(" "), TOUCH_FLOOR.text]),
    );
    const custom = classesOf(html(<Input className="h-8 text-sm" />), "input");
    expect(sorted(custom)).toEqual(sorted([...cn(controlClasses, "h-9", "h-8 text-sm").split(" "), ...FLOOR]));
  });

  it("a number is still the HTML size attribute", () => {
    expect(html(<Input size={12} />)).toContain('size="12"');
    expect(html(<Select size={4} />)).toContain('size="4"');
    expect(html(<Input />)).not.toMatch(/ size="/);
    expect(sorted(classesOf(html(<Input size={12} />), "input"))).toEqual(sorted(classesOf(html(<Input />), "input")));
  });

  it('size="lg" is 48px with 16px text at every width', () => {
    for (const markup of [html(<Input size="lg" />), html(<Select size="lg" />)]) {
      const classes = classesOf(markup, markup.startsWith("<input") ? "input" : "select");
      expect(classes).toContain("h-12");
      expect(classes).toContain("lg:text-base");
      expect(classes).toContain("text-base");
      expect(classes).not.toContain("h-9");
      expect(classes).not.toContain("lg:text-sm");
      expect(markup).not.toMatch(/ size="/);
    }
    expect(CONTROL_SIZE_CLASS).toEqual({ md: "h-9", lg: "h-12 lg:text-base" });
  });
});

describe("Combobox and DateInput", () => {
  const options = [{ value: "a", label: "A" }];
  it("default: the input keeps its 1.2 classes plus the floor", () => {
    const combo = html(<Combobox value="a" options={options} onChange={() => {}} />);
    expect(sorted(classesOf(combo, "input"))).toEqual(sorted(classesOf(html(<Input />), "input")));
    const date = html(<DateInput defaultValue="2026-10-01" />);
    expect(sorted(classesOf(date, "input"))).toEqual(sorted([...cn(controlClasses, "h-9 pr-9 tabular-nums").split(" "), ...FLOOR]));
  });

  it('size="lg" reaches the field', () => {
    expect(classesOf(html(<Combobox value="a" options={options} onChange={() => {}} size="lg" />), "input")).toContain("h-12");
    const date = classesOf(html(<DateInput size="lg" />), "input");
    expect(date).toContain("h-12");
    expect(date).toContain("lg:text-base");
    expect(date).not.toContain("h-9");
  });
});

/** Button's 1.2 class list for a variant and size (the cva of release 1.2.0, written out). */
const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-control font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

describe("Button", () => {
  it("an unchanged call site keeps its 1.2 classes and gains only the floor height", () => {
    expect(sorted(classesOf(html(<Button>Save</Button>), "button"))).toEqual(
      sorted(cn(BUTTON_BASE, "bg-primary text-white hover:bg-primary-hover", "h-9 px-3.5 text-sm", TOUCH_FLOOR.height)),
    );
    expect(sorted(classesOf(html(<Button variant="secondary" size="sm">Edit</Button>), "button"))).toEqual(
      sorted(cn(BUTTON_BASE, "border border-border-strong bg-bg text-ink hover:bg-surface", "h-8 px-3 text-detail", TOUCH_FLOOR.height)),
    );
    // The glyph of a sm/md button is the 1.2 glyph.
    expect(html(<Button icon="add">New</Button>)).toContain('class="inline-block shrink-0 align-middle"');
    expect(classesOf(html(<ButtonLink href="/x">Open</ButtonLink>), "a")).toContain(TOUCH_FLOOR.height);
  });

  it('size="lg": 48px, 16px text, a 16px glyph', () => {
    const markup = html(<Button size="lg" icon="save">Save</Button>);
    const classes = classesOf(markup, "button");
    for (const c of ["h-12", "px-4", "text-base"]) expect(classes).toContain(c);
    expect(classes).not.toContain("h-9");
    expect(markup).toContain('class="inline-block shrink-0 align-middle size-4"');
  });
});

describe("IconButton", () => {
  it("the label is the accessible name and the tooltip; a plain button, ghost by default", () => {
    const markup = html(<IconButton icon="edit" label="Edit row" />);
    expect(markup).toMatch(/^<button type="button" aria-label="Edit row" title="Edit row" class="/);
    expect(markup).toContain('data-action-icon="edit"');
    const classes = classesOf(markup, "button");
    expect(classes).toContain("text-ink-secondary"); // ghost
    expect(classes).toContain("size-9");
    expect(classes).toContain("px-0");
    expect(classes).not.toContain("h-9");
    expect(classes).toContain(TOUCH_FLOOR.height);
    expect(classes).toContain(TOUCH_FLOOR.width);
    expect(html(<IconButton icon="edit" label="x" type="submit" />)).toContain('type="submit"');
  });

  it("square at sm, md and lg; any Button variant", () => {
    expect(classesOf(html(<IconButton icon="add" label="x" size="sm" />), "button")).toContain("size-8");
    expect(classesOf(html(<IconButton icon="add" label="x" size="lg" />), "button")).toContain("size-12");
    expect(html(<IconButton icon="add" label="x" size="lg" />)).toContain("size-5");
    expect(classesOf(html(<IconButton icon="add" label="x" variant="primary" />), "button")).toContain("bg-primary");
  });

  it("read-only aware like Button; the glyph is drawn even where action icons are off", () => {
    expect(html(<ReadOnlyScope readOnly><IconButton icon="edit" label="Edit" /></ReadOnlyScope>)).toBe("");
    expect(html(<ReadOnlyScope readOnly><IconButton icon="download" label="Download" readOnlySafe /></ReadOnlyScope>)).toContain(
      'aria-label="Download"',
    );
    expect(html(<ActionIconScope enabled={false}><IconButton icon="mail" label="Mail" /></ActionIconScope>)).toContain(
      'data-action-icon="mail"',
    );
  });
});

describe("Segmented and the RowMenu trigger", () => {
  it("carry the floor", () => {
    const seg = html(<Segmented label="x" value="a" options={[{ value: "a", label: "A", href: "?a" }]} />);
    expect(classesOf(seg, "a")).toContain(TOUCH_FLOOR.height);
    const menu = html(<RowMenu label="Actions" items={[{ key: "e", label: "Edit", icon: "edit", onClick: () => {} }]} />);
    const trigger = classesOf(menu, "button");
    expect(trigger).toContain(TOUCH_FLOOR.height);
    expect(trigger).toContain(TOUCH_FLOOR.width);
  });
});

// The stacking variables (M1, restyle plan 5.5): each fixed layer reads its variable, whose
// fallback is exactly the literal z-index of release 1.2.0, so an app that sets nothing renders
// the same stacking.
const STACKING = [
  { variable: "--ops-z-toast", fallback: 60, was: "z-[60]", file: "src/components/toast.tsx" },
  { variable: "--ops-z-calendar", fallback: 50, was: "z-50", file: "src/components/date-input.tsx" },
  { variable: "--ops-z-menu", fallback: 40, was: "z-40", file: "src/components/row-menu.tsx" },
  { variable: "--ops-z-menu", fallback: 40, was: "z-40", file: "src/components/app-switcher.tsx" },
  { variable: "--ops-z-sheet", fallback: 40, was: "z-40", file: "src/components/sheet.tsx" },
];

function releaseCommit(version: string): string {
  const hash = execFileSync("git", ["log", "--format=%H", `--grep=^release: v${version}$`, "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  if (!hash || hash.includes("\n")) throw new Error(`release: v${version} not found once in the history`);
  return hash;
}

describe("the stacking variables", () => {
  const v120 = releaseCommit("1.2.0");

  for (const { variable, fallback, was, file } of STACKING) {
    it(`${file}: ${variable} defaults to ${fallback}, the z-index it had in 1.2.0`, () => {
      const now = readSource(file);
      const klass = `z-[var(${variable},${fallback})]`;
      const lines = now.split("\n").filter((line) => line.includes(klass));
      expect(lines).toHaveLength(1);
      const old = execFileSync("git", ["show", `${v120}:${file}`], { cwd: ROOT, encoding: "utf8" });
      // The line as it was in 1.2.0: the same line with the literal class in place of the variable.
      expect(old.split("\n")).toContain(lines[0].replace(klass, was));
    });
  }

  it("the fallback and the literal compile to the same z-index", async () => {
    for (const { variable, fallback, was } of STACKING) {
      const out = await css([`z-[var(${variable},${fallback})]`, was]);
      expect(out).toContain(`z-index: var(${variable},${fallback});`);
      expect(out).toContain(`z-index: ${fallback};`);
    }
  });

  it("TOKENS.md lists each variable with its default", () => {
    const tokens = readSource("TOKENS.md");
    for (const { variable, fallback } of STACKING) {
      expect(tokens).toMatch(new RegExp(`\\| \`${variable}\` \\| \`${fallback}\` \\|`));
    }
  });
});
