import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { compile } from "tailwindcss";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Button, ButtonLink, ExternalButtonLink, FileLink, IconButton, IconLink } from "../src/components/button";
import { ConfirmDialog } from "../src/components/confirm-dialog";
import { DateInput } from "../src/components/date-input";
import { Dialog, DialogFooter } from "../src/components/dialog";
import { Disclosure } from "../src/components/disclosure";
import { Checkbox, FileInput } from "../src/components/field";
import { FoldTable, type FoldTableColumn } from "../src/components/fold-table";
import { Combobox } from "../src/components/combobox";
import { CopyValue } from "../src/components/copy-value";
import { PageHeader } from "../src/components/page-header";
import { Radio } from "../src/components/radio";
import { Segmented } from "../src/components/segmented";
import { Sheet } from "../src/components/sheet";
import { TD, TFoot, TGroupRow, TR, TTotalRow } from "../src/components/table";
import { Tag } from "../src/components/tag";
import { TagRemove } from "../src/components/tag-remove";
import { Text } from "../src/components/text";
import { TextButton } from "../src/components/text-button";
import { YearInput } from "../src/components/year-input";
import { ReadOnlyScope } from "../src/config/read-only";
import { TOUCH_FLOOR, TOUCH_FLOOR_LG, TOUCH_TARGET } from "../src/lib/touch";
import { readSource, ROOT } from "./source-files";

// 1.8.0 (styling programme spec §4.8): the kit gaps the three apps reported. Every addition is
// additive: a call site without the new props renders what 1.7 rendered, except the declared
// changes (a button label's whitespace-nowrap; touch-floor classes that paint only under
// [data-ops-touch] on a coarse pointer; PageHeader's and DialogFooter's note's flex basis;
// RowMenu's list in the top layer; the bare Checkbox's display: contents label). Here: the markup
// and the classes; gallery/tests/behaviour.spec.ts "1.8.0" measures them in a browser.

const html = (el: ReactElement) => renderToStaticMarkup(el);
const noop = () => {};
const FLOOR = "[@media(hover:none)_and_(pointer:coarse)]:in-data-ops-touch:";
/** The class tokens of the first element whose opening tag matches `pattern`. */
function classesWhere(markup: string, pattern: RegExp): string[] {
  for (const m of markup.matchAll(/<([a-z0-9]+)\b([^>]*)>/g)) {
    if (!pattern.test(m[0])) continue;
    const cls = /class="([^"]*)"/.exec(m[2]);
    if (cls) return cls[1].split(/\s+/);
  }
  throw new Error(`no element matching ${pattern} in ${markup}`);
}
const sortClasses = (markup: string) =>
  markup.replace(/class="([^"]*)"/g, (_, c: string) => `class="${c.split(/\s+/).filter(Boolean).sort().join(" ")}"`);

describe("1.8.0 buttons: labels never wrap", () => {
  it("every kit button and button link carries whitespace-nowrap", () => {
    for (const [name, markup, tag] of [
      ["Button", html(<Button>Save</Button>), "button"],
      ["ButtonLink", html(<ButtonLink href="/x">Open</ButtonLink>), "a"],
      ["ExternalButtonLink", html(<ExternalButtonLink href="tel:1">Call</ExternalButtonLink>), "a"],
      ["FileLink", html(<FileLink href="/f.pdf">Open PDF</FileLink>), "a"],
      ["IconButton", html(<IconButton icon="edit" label="Edit" />), "button"],
      ["IconLink", html(<IconLink href="/f.pdf" label="Download" />), "a"],
      ["TextButton", html(<TextButton variant="quiet">Show all</TextButton>), "button"],
    ] as const) {
      expect(classesWhere(markup, new RegExp(`^<${tag}\\b`)), name).toContain("whitespace-nowrap");
    }
  });

  it("className may still allow wrapping (tailwind-merge keeps the caller's)", () => {
    const cls = classesWhere(html(<Button className="whitespace-normal">A long label</Button>), /^<button/);
    expect(cls).toContain("whitespace-normal");
    expect(cls).not.toContain("whitespace-nowrap");
  });
});

describe("1.8.0 the inline action: size xs", () => {
  it("is 24px, 13px, tight, quiet whatever the variant", () => {
    const base = (variant: "primary" | "secondary" | "ghost" | "ghostDanger" | "admin" | "danger") =>
      classesWhere(html(<Button variant={variant} size="xs">x</Button>), /^<button/);
    for (const variant of ["primary", "secondary", "ghost", "ghostDanger", "admin", "danger"] as const) {
      const cls = base(variant);
      for (const c of ["h-6", "px-1.5", "gap-1", "text-detail", "whitespace-nowrap", TOUCH_FLOOR.height]) expect(cls, `${variant} ${c}`).toContain(c);
      // No fill and no border at rest.
      expect(cls.filter((c) => /^bg-(primary|danger|bg)$/.test(c)), variant).toEqual([]);
      expect(cls.filter((c) => c === "border"), variant).toEqual([]);
    }
    expect(base("primary")).toEqual(expect.arrayContaining(["bg-transparent", "text-primary", "hover:bg-primary-subtle"]));
    expect(base("primary")).not.toContain("text-white");
    expect(base("secondary")).toEqual(expect.arrayContaining(["border-0", "bg-transparent", "text-ink", "hover:bg-surface"]));
    expect(base("danger")).toEqual(expect.arrayContaining(["bg-transparent", "text-danger", "hover:bg-danger/10"]));
    expect(base("ghost")).toEqual(expect.arrayContaining(["text-ink-secondary", "hover:bg-surface"]));
    expect(base("admin")).toEqual(expect.arrayContaining(["text-admin", "border-0", "bg-transparent"]));
  });

  it("the other sizes render exactly their 1.7 classes (plus whitespace-nowrap)", () => {
    const cls = classesWhere(html(<Button variant="secondary" size="sm">Edit</Button>), /^<button/);
    expect(cls).toEqual(expect.arrayContaining(["border", "border-border-strong", "bg-bg", "h-8", "px-3"]));
    expect(cls).not.toContain("bg-transparent");
  });

  it("IconButton and IconLink are a 24px square at xs, 44 x 44 under the floor", () => {
    for (const markup of [html(<IconButton size="xs" icon="edit" label="Edit" />), html(<IconLink size="xs" href="/f" label="Download" />)]) {
      const cls = classesWhere(markup, /^<(button|a)\b/);
      expect(cls).toEqual(expect.arrayContaining(["size-6", "px-0", TOUCH_FLOOR.height, TOUCH_FLOOR.width]));
    }
  });

  it("FileLink takes xs", () => {
    expect(classesWhere(html(<FileLink href="/f.pdf" size="xs">Certificate</FileLink>), /^<a\b/)).toContain("h-6");
  });
});

describe("1.8.0 IconLink: the icon-only download link", () => {
  it("is a native anchor named by its label, the download glyph by default, any anchor attribute passed on", () => {
    const out = html(<IconLink href="/pack.pdf" label="Download production pack" download="pack.pdf" />);
    expect(out).toMatch(/^<a aria-label="Download production pack" title="Download production pack" class="[^"]+" href="\/pack.pdf" download="pack.pdf">/);
    expect(out).toContain('data-action-icon="download"');
    expect(html(<IconLink href="/d.pdf" label="Open" icon="view" target="_blank" />)).toContain('data-action-icon="view"');
  });

  it("changes no data: it shows in a read-only scope", () => {
    expect(html(<ReadOnlyScope readOnly><IconLink href="/x" label="Download" /></ReadOnlyScope>)).toContain("<a ");
  });
});

describe("1.8.0 lg: Dialog, DialogFooter, ConfirmDialog, FileInput, Segmented, DateInput / YearInput", () => {
  it("Dialog size lg: the ✕ is 48 x 48 at every width; md keeps the 1.7 ✕", () => {
    const lg = classesWhere(html(<Dialog open={false} onClose={noop} title="Weight" size="lg">x</Dialog>), /aria-label="Close"/);
    expect(lg).toEqual(expect.arrayContaining(["size-12", "p-0", "inline-flex", "items-center", "justify-center"]));
    expect(lg).not.toContain("p-2.5");
    const md = classesWhere(html(<Dialog open={false} onClose={noop} title="Weight">x</Dialog>), /aria-label="Close"/);
    expect(md).toContain("p-2.5");
    expect(md).not.toContain("size-12");
  });

  it("DialogFooter and ConfirmDialog size lg: both buttons are lg", () => {
    const footer = html(<DialogFooter size="lg" onClose={noop} onSubmit={noop} submitLabel="Save" />);
    for (const m of footer.matchAll(/<button[^>]*class="([^"]*)"/g)) expect(m[1].split(" ")).toContain("h-12");
    const confirm = html(<ConfirmDialog size="lg" open={false} onClose={noop} onConfirm={noop} title="Remove" confirmLabel="Remove" />);
    expect([...confirm.matchAll(/<button[^>]*class="([^"]*)"/g)].map((m) => m[1].split(" ").includes("h-12") || m[1].split(" ").includes("size-12"))).toEqual([true, true, true]);
  });

  it("FileInput size lg is 48px with 16px text; a number is still the HTML attribute", () => {
    const cls = classesWhere(html(<FileInput size="lg" />), /^<input/);
    expect(cls).toEqual(expect.arrayContaining(["min-h-12", "lg:text-base", "file:px-4", "file:py-1.5", "file:text-sm"]));
    expect(html(<FileInput size={20} />)).toContain('size="20"');
    expect(classesWhere(html(<FileInput />), /^<input/)).not.toContain("min-h-12");
  });

  it("Segmented size lg: a 48px control with 16px options", () => {
    const out = html(<Segmented label="Format" size="lg" value="a" options={[{ value: "a", label: "A4", href: "?a" }]} />);
    expect(classesWhere(out, /role="navigation"/)).toEqual(expect.arrayContaining(["min-h-12", "items-stretch"]));
    expect(classesWhere(out, /^<a\b/)).toEqual(expect.arrayContaining(["px-4", "text-base"]));
  });

  it("DateInput / YearInput at lg: the field button's floor is 48 x 48 and the text keeps 56px clear", () => {
    for (const markup of [html(<DateInput size="lg" />), html(<YearInput size="lg" />)]) {
      const button = classesWhere(markup, /^<button/);
      expect(button).toEqual(expect.arrayContaining([TOUCH_FLOOR_LG.height, TOUCH_FLOOR_LG.width]));
      expect(classesWhere(markup, /role="combobox"/)).toContain(`${FLOOR}pr-14`);
    }
    for (const markup of [html(<DateInput />), html(<YearInput />)]) {
      expect(classesWhere(markup, /^<button/)).not.toContain(TOUCH_FLOOR_LG.height);
      expect(classesWhere(markup, /role="combobox"/)).not.toContain(`${FLOOR}pr-14`);
    }
  });
});

describe("1.8.0 touch floor", () => {
  it("the bare Checkbox: a display:contents label with a 44 x 44 target under the floor, the box 20px", () => {
    const out = html(<Checkbox aria-label="Select line" checked onChange={noop} />);
    expect(out).toMatch(/^<label class="[^"]*" data-ops-checkbox=""><input type="checkbox" /);
    const wrapper = classesWhere(out, /^<label/);
    expect(wrapper).toContain("contents");
    expect(wrapper).toContain(`${FLOOR}inline-flex`);
    for (const c of TOUCH_TARGET) expect(wrapper).toContain(c);
    expect(classesWhere(out, /^<input/)).toEqual(expect.arrayContaining(["size-4", "accent-primary", `${FLOOR}size-5`]));
  });

  it("the labelled Checkbox and Radio: the row 44px, the box 20px", () => {
    for (const out of [html(<Checkbox label="Show password" />), html(<Radio label="Book a bed" />)]) {
      expect(classesWhere(out, /^<label/)).toContain(TOUCH_FLOOR.height);
      expect(classesWhere(out, /^<input/)).toContain(`${FLOOR}size-5`);
    }
  });

  it("Segmented options are at least 44 wide too, centred", () => {
    const out = html(<Segmented label="Group" value="1" options={[{ value: "1", label: "1", href: "?1" }]} />);
    expect(classesWhere(out, /^<a\b/)).toEqual(expect.arrayContaining([TOUCH_FLOOR.height, TOUCH_FLOOR.width, "justify-center"]));
  });

  it("Combobox options, CopyValue and TagRemove", () => {
    expect(readSource("src/components/combobox.tsx")).toContain(`"${FLOOR}py-3"`);
    expect(classesWhere(html(<CopyValue value="LM-2026-001" />), /^<button/)).toEqual(expect.arrayContaining([...TOUCH_TARGET]));
    expect(classesWhere(html(<TagRemove label="Remove" />), /^<button/)).toEqual(expect.arrayContaining([...TOUCH_TARGET]));
  });

  it("every new floor class compiles into the floor's media block behind [data-ops-touch], and nowhere else", async () => {
    const classes = [
      ...TOUCH_TARGET,
      TOUCH_FLOOR_LG.height,
      TOUCH_FLOOR_LG.width,
      `${FLOOR}size-5`,
      `${FLOOR}inline-flex`,
      `${FLOOR}py-3`,
      `${FLOOR}pr-14`,
    ];
    const compiler = await compile(`@tailwind utilities;\n@theme { --spacing: 0.25rem; }`);
    const out = compiler.build(classes);
    const at = out.indexOf("@media (hover:none) and (pointer:coarse)");
    expect(at, out).toBeGreaterThanOrEqual(0);
    const end = out.indexOf("\n}\n", at);
    const media = out.slice(at, end);
    for (const c of classes) {
      const escaped = c.replace(/[[\]():/.@_]/g, (ch) => `\\${ch}`);
      expect(media, c).toContain(escaped.slice(-12));
    }
    expect(out.slice(0, at) + out.slice(end)).not.toMatch(/min-height|min-width|padding|translate:|width: 100%|position:/);
    const selectors = [...media.matchAll(/^\s*([^{}@\s][^{}]*?) \{/gm)].map((m) => m[1]).filter((s) => !s.startsWith("@") && !s.startsWith("&"));
    expect(selectors.length).toBeGreaterThan(0);
    for (const sel of selectors) expect(sel.startsWith(":where([data-ops-touch]) ."), sel).toBe(true);
    // The target is centred and never smaller than the control.
    expect(media).toMatch(/translate: var\(--tw-translate-x\) var\(--tw-translate-y\)/);
  });
});

describe("1.8.0 Sheet: a pinned footer", () => {
  it("renders the footer under the scroller, the body then without the thumb-rail padding", () => {
    const out = html(<Sheet title="Lead" onClose={noop} footer={<button type="submit">Save</button>}>body</Sheet>);
    expect(out).toMatch(/overscroll-contain px-5 py-4">body<\/div><div class="shrink-0 border-t border-border px-5 py-3 pb-\[calc\(0\.75rem\+env\(safe-area-inset-bottom\)\)\]"><button type="submit">Save<\/button><\/div>/);
    const without = html(<Sheet title="Lead" onClose={noop}>body</Sheet>);
    expect(without).toContain('class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 pb-24 sm:pb-4">body</div></aside>');
  });
});

describe("1.8.0 Tag warning, Text as a heading", () => {
  it("Tag tone warning: amber border and fill, the icon in its colour", () => {
    const out = html(<Tag tone="warning" icon={<i />}>Weight differs</Tag>);
    expect(classesWhere(out, /^<span/)).toEqual(expect.arrayContaining(["border", "border-warning/30", "bg-warning-subtle", "text-warning"]));
    expect(out).toContain('<span class="inline-flex shrink-0"><i></i></span>');
  });

  it("Text renders h1-h6 with exactly its style classes", () => {
    expect(html(<Text as="h3" size="detail" weight="medium">Cut list</Text>)).toBe('<h3 class="text-detail font-medium">Cut list</h3>');
    expect(html(<Text as="h2">x</Text>)).toBe("<h2>x</h2>");
  });
});

describe("1.8.0 Table: a TR without a router; group rows; the total", () => {
  it("TR renders without a mounted App Router, with and without href (no router mock needed)", () => {
    expect(html(<table><tbody><TR><TD>a</TD></TR></tbody></table>)).toBe('<table><tbody><tr class=""><td class="px-4 py-3 align-middle text-ink">a</td></tr></tbody></table>');
    expect(html(<table><tbody><TR href="/x"><TD>a</TD></TR></tbody></table>)).toContain('<tr class="cursor-pointer transition-colors duration-150 hover:bg-surface">');
  });

  it("TGroupRow: a spanning heading row, or a folding label with the row's further cells", () => {
    const heading = html(<table><tbody><TGroupRow colSpan={3} label="Pipes" meta="2 articles" /></tbody></table>);
    expect(heading).toContain('<tr class="bg-surface" data-group-row=""><td colSpan="3" class="px-4 py-1.5">');
    expect(heading).toContain("Pipes");
    expect(heading).toContain('<span class="shrink-0 text-detail text-ink-secondary">2 articles</span>');
    expect(heading).not.toContain("<button");
    const folding = html(<table><tbody><TGroupRow label="Material" count={2} open onToggle={noop}><TD numeric>6,052.50</TD></TGroupRow></tbody></table>);
    expect(folding).toMatch(/<button type="button" aria-expanded="true" class="[^"]*">/);
    expect(folding).toContain("rotate-90");
    expect(folding).toContain('<span class="font-normal tabular-nums text-ink-muted">2</span>');
    expect(folding).toContain('6,052.50</td></tr>');
    // Folding is view state: the toggle stays in a read-only scope.
    expect(html(<ReadOnlyScope readOnly><table><tbody><TGroupRow label="M" open={false} onToggle={noop} /></tbody></table></ReadOnlyScope>)).toContain('aria-expanded="false"');
  });

  it("TFoot + TTotalRow: a strong hairline, the label then the caller's cells, semibold", () => {
    const out = html(<table><TFoot><TTotalRow label="Total cost" labelColSpan={2}><TD numeric>11,244.50</TD></TTotalRow></TFoot></table>);
    expect(out).toBe(
      '<table><tfoot class="border-t border-border-strong"><tr class="font-semibold"><td colSpan="2" class="px-4 py-3 text-sm text-ink">Total cost</td><td class="px-4 py-3 align-middle text-ink text-right font-mono">11,244.50</td></tr></tfoot></table>',
    );
  });
});

describe("1.8.0 Combobox: a pick marks the enclosing Dialog dirty", () => {
  it("pick() dispatches a bubbling input event from the combobox before onChange, only when the value changes", () => {
    const src = readSource("src/components/combobox.tsx");
    expect(src).toContain('if (next !== value) rootRef.current?.dispatchEvent(new Event("input", { bubbles: true }));');
    expect(html(<Combobox value="" options={[]} onChange={noop} />)).toMatch(/^<div class="relative">/);
  });
});

describe("1.8.0 Segmented: changesData in a read-only scope", () => {
  const options = [
    { value: "a", label: "Generated" },
    { value: "b", label: "Uploaded" },
  ];
  it("disabled in a read-only scope when it changes data, unless readOnlySafe; a view choice stays enabled", () => {
    const inScope = (node: ReactElement) => html(<ReadOnlyScope readOnly>{node}</ReadOnlyScope>);
    expect(inScope(<Segmented label="Mode" changesData value="a" onValueChange={noop} options={options} />)).toMatch(/<button type="button" aria-pressed="true" disabled=""/);
    expect(inScope(<Segmented label="Mode" changesData readOnlySafe value="a" onValueChange={noop} options={options} />)).not.toContain('disabled=""');
    expect(inScope(<Segmented label="Stage" value="a" onValueChange={noop} options={options} />)).not.toContain('disabled=""');
    expect(html(<Segmented label="Mode" changesData value="a" onValueChange={noop} options={options} />)).not.toContain('disabled=""');
  });
});

describe("1.8.0 PageHeader and DialogFooter: no needless second row", () => {
  it("PageHeader's title block asks for 20rem and grows (from sm)", () => {
    const out = html(<PageHeader title="Workers" description="A long description" actions={<span />} />);
    expect(out).toContain('<div class="min-w-0 sm:grow sm:basis-80">');
  });
  it("DialogFooter's note takes the room left (at least 6rem) and wraps inside itself", () => {
    const out = html(<DialogFooter onClose={noop} submitLabel="Save" note="A note" />);
    expect(out).toContain('<span class="mr-auto min-w-24 grow basis-0 text-detail text-ink-muted">A note</span>');
  });
});

// ---- Promoted from PrefabOps: Disclosure and FoldTable render what Prefab's own files render ----
// tests/fixtures/prefab-1-8/*.tsx.txt are prefab-ops-platform 0786fd0
// apps/web/src/components/prefab-ui/disclosure.tsx and review-grid.tsx byte for byte. The test
// rewrites only their `@/components/ui/table` import (to the library's table) and renders both
// copies; classes are compared as sets (the library merges with tailwind-merge, Prefab with clsx),
// and the container fold's named variants are read as the library's values (`@max-lg:` =
// `@max-[32rem]:`, `@lg:` = `@min-[32rem]:`, the same queries).

const SANDBOX = mkdtempSync(path.join(os.tmpdir(), "ops-ui-1-8-"));
afterAll(() => rmSync(SANDBOX, { recursive: true, force: true }));

type PrefabDisclosure = typeof Disclosure;
let PrefabDisclosureComponent: PrefabDisclosure;
let PrefabReviewGrid: typeof FoldTable;

beforeAll(async () => {
  symlinkSync(path.join(ROOT, "node_modules"), path.join(SANDBOX, "node_modules"), "dir");
  const dir = path.join(SANDBOX, "prefab");
  mkdirSync(dir, { recursive: true });
  const disclosure = readFileSync(path.join(ROOT, "tests/fixtures/prefab-1-8/disclosure.tsx.txt"), "utf8");
  const grid = readFileSync(path.join(ROOT, "tests/fixtures/prefab-1-8/review-grid.tsx.txt"), "utf8");
  expect(grid).toContain("from '@/components/ui/table';");
  writeFileSync(path.join(dir, "disclosure.tsx"), disclosure);
  writeFileSync(
    path.join(dir, "review-grid.tsx"),
    grid.replace("from '@/components/ui/table';", `from ${JSON.stringify(path.join(ROOT, "src/components/table"))};`),
  );
  PrefabDisclosureComponent = (await import(pathToFileURL(path.join(dir, "disclosure.tsx")).href)).Disclosure;
  PrefabReviewGrid = (await import(pathToFileURL(path.join(dir, "review-grid.tsx")).href)).ReviewGrid;
});

describe("1.8.0 Disclosure = PrefabOps' Disclosure", () => {
  const cases: Parameters<typeof Disclosure>[0][] = [
    { title: "Material worksheet", children: "body" },
    { title: "Step", kicker: "Step 1", meta: <span>3</span>, bordered: true, defaultOpen: true, children: "body" },
    { title: "Controlled", open: true, onToggle: noop, className: "mt-2", bodyClassName: "gap-2", children: "body" },
    { title: "Drawings", bordered: true, large: true, flushBody: true, children: <ul /> },
  ];
  it.each(cases.map((props, i) => [i, props] as const))("case %i", (_i, props) => {
    expect(sortClasses(html(<Disclosure {...props} />))).toBe(sortClasses(html(<PrefabDisclosureComponent {...props} />)));
  });
});

describe("1.8.0 FoldTable = PrefabOps' ReviewGrid", () => {
  type Row = { id: string; name: string; qty: number };
  const rows: Row[] = [
    { id: "1", name: "Pipe", qty: 12 },
    { id: "2", name: "Elbow", qty: 4 },
  ];
  const columns: FoldTableColumn<Row>[] = [
    { key: "name", header: "Designation", cell: (r) => r.name },
    { key: "qty", header: "Qty", numeric: true, foldSpan: 2, className: "md:w-20", headerAction: <b>all</b>, cell: (r) => r.qty },
    { key: "actions", header: "Actions", bare: true, cell: () => <i /> },
  ];
  const asLibrary = (markup: string) => markup.replaceAll("@max-lg:", "@max-[32rem]:").replaceAll("@lg:", "@min-[32rem]:");
  for (const fold of ["md", "container"] as const) {
    for (const flush of [false, true]) {
      it(`fold ${fold}, flush ${flush}`, () => {
        const props = { label: "Positions", columns, rows, rowKey: (r: Row) => r.id, rowId: (r: Row) => `row-${r.id}`, rowClassName: (r: Row) => (r.id === "2" ? "bg-warning-subtle" : undefined), fold, flush };
        expect(sortClasses(html(<FoldTable {...props} />))).toBe(sortClasses(asLibrary(html(<PrefabReviewGrid {...props} />))));
      });
    }
  }
});
