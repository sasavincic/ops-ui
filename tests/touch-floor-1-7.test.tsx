import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { compile } from "tailwindcss";
import { describe, expect, it } from "vitest";
import { DateInput } from "../src/components/date-input";
import { Dialog } from "../src/components/dialog";
import { FileInput, Switch } from "../src/components/field";
import { Grid } from "../src/components/grid";
import { YearInput } from "../src/components/year-input";
import { TOUCH_FLOOR } from "../src/lib/touch";
import { readSource } from "./source-files";

// 1.7.0: the touch floor reaches the kit's own small targets (the PrefabOps restyle's P4.3 / P4.4a
// findings, plan §10.2). Every new class sits behind the floor's media query AND [data-ops-touch],
// so a fine pointer, and every app without the attribute, renders exactly as in 1.6 (the 1440 and
// 375 shots of every story prove the pixels; gallery/tests/behaviour.spec.ts "touch floor (1.7.0)"
// measures the 44px in a real phone context). Here: the classes are there, and they compile into
// the floor's media block only.

const html = (el: ReactElement) => renderToStaticMarkup(el);
const noop = () => {};
const FLOOR_PREFIX = "[@media(hover:none)_and_(pointer:coarse)]:in-data-ops-touch:";
/** The class tokens of the element whose opening tag matches `pattern`. */
function classesWhere(markup: string, pattern: RegExp): string[] {
  for (const m of markup.matchAll(/<([a-z]+)\b([^>]*)>/g)) {
    if (!pattern.test(m[0])) continue;
    const cls = /class="([^"]*)"/.exec(m[2]);
    if (cls) return cls[1].split(/\s+/);
  }
  throw new Error(`no element matching ${pattern} in ${markup}`);
}
/** Every class a source file names behind the floor's prefix (as written, so Tailwind sees it). */
const floorClassesIn = (file: string) =>
  [...readSource(file).matchAll(/\[@media\(hover:none\)_and_\(pointer:coarse\)\]:in-data-ops-touch:[^\s"'`]+/g)].map((m) => m[0]);

describe("1.7.0 touch floor: the new classes", () => {
  const NEW = [
    `${FLOOR_PREFIX}pr-12`,
    `${FLOOR_PREFIX}-my-3.5`,
    `${FLOOR_PREFIX}after:absolute`,
    `${FLOOR_PREFIX}after:-inset-x-2`,
    `${FLOOR_PREFIX}after:-inset-y-3`,
  ];

  it("each is written whole in the component that uses it", () => {
    expect(floorClassesIn("src/components/date-input.tsx")).toContain(NEW[0]);
    expect(floorClassesIn("src/components/year-input.tsx")).toContain(NEW[0]);
    expect(floorClassesIn("src/components/toast.tsx")).toContain(NEW[1]);
    for (const c of NEW.slice(2)) expect(floorClassesIn("src/components/field.tsx")).toContain(c);
  });

  it("compile into the floor's media block, behind [data-ops-touch], and nowhere else", async () => {
    const compiler = await compile(`@tailwind utilities;\n@theme { --spacing: 0.25rem; }`);
    const out = compiler.build(NEW);
    const at = out.indexOf("@media (hover:none) and (pointer:coarse)");
    expect(at, out).toBeGreaterThanOrEqual(0);
    const end = out.indexOf("\n}\n", at);
    const media = out.slice(at, end);
    // Outside the block only the theme and Tailwind's own --tw-content registration.
    expect(out.slice(0, at) + out.slice(end)).not.toMatch(/padding-|margin-(block|top|bottom)|position:|inset-(block|inline)/);
    const selectors = [...media.matchAll(/^\s*([^{}@\s][^{}]*?) \{/gm)].map((m) => m[1]).filter((s) => !s.startsWith("@"));
    expect(selectors.length).toBeGreaterThan(0);
    for (const sel of selectors) expect(sel.startsWith(":where([data-ops-touch]) ."), sel).toBe(true);
    expect(out).toMatch(/::after/);
  });
});

describe("1.7.0 touch floor: each component carries it", () => {
  it("Dialog: the ✕ is floored on both sides", () => {
    const markup = html(<Dialog open={false} onClose={noop} title="Rename worksite">x</Dialog>);
    const x = classesWhere(markup, /aria-label="Close"/);
    expect(x).toContain(TOUCH_FLOOR.height);
    expect(x).toContain(TOUCH_FLOOR.width);
    expect(x).toContain("p-2.5"); // the 1.6 look stays for a fine pointer
  });

  it("toast: the ✕ is floored on both sides and keeps the toast's height", () => {
    const src = readSource("src/components/toast.tsx");
    const line = src.split("\n").find((l) => l.includes("-my-1 shrink-0 rounded-control p-1.5"))!;
    expect(line).toContain("TOUCH_FLOOR.height");
    expect(line).toContain("TOUCH_FLOOR.width");
    expect(line).toContain(`${FLOOR_PREFIX}-my-3.5`);
  });

  it("DateInput and YearInput: the field's button is floored and the text keeps clear of it", () => {
    for (const markup of [html(<DateInput defaultValue="2026-10-01" />), html(<YearInput defaultValue="2024" />)]) {
      const button = classesWhere(markup, /<button[^>]*aria-label="Choose (year|date)|<button[^>]*aria-label="Open calendar"/);
      expect(button).toContain(TOUCH_FLOOR.height);
      expect(button).toContain(TOUCH_FLOOR.width);
      expect(button).toContain("size-7");
      const input = classesWhere(markup, /<input[^>]*role="combobox"/);
      expect(input).toContain("pr-9");
      expect(input).toContain(`${FLOOR_PREFIX}pr-12`);
    }
  });

  it("DateInput and YearInput: the calendar's arrows, title, days and footer buttons are floored", () => {
    const date = readSource("src/components/date-input.tsx");
    const year = readSource("src/components/year-input.tsx");
    for (const src of [date, year]) {
      expect(src).toMatch(/"flex size-8 items-center[^"]*", TOUCH_FLOOR\.height, TOUCH_FLOOR\.width\)/);
      expect(src.match(/"px-2 py-1 text-detail", TOUCH_FLOOR\.height\)/g)).toHaveLength(2);
    }
    expect(date).toMatch(/"h-9 tabular-nums",\n\s*\/\/[^\n]*\n\s*TOUCH_FLOOR\.height,/);
    expect(date).toMatch(/"inline-flex items-center gap-1 rounded-control px-2 py-1 text-sm font-semibold text-ink hover:bg-surface-raised", TOUCH_FLOOR\.height\)/);
  });

  it("FileInput is floored", () => {
    expect(classesWhere(html(<FileInput />), /type="file"/)).toContain(TOUCH_FLOOR.height);
  });

  it("Switch: the row is floored and the track gains an invisible target, keeping h-6 w-10", () => {
    const markup = html(<Switch label="Never expires" checked onChange={noop} />);
    expect(classesWhere(markup, /^<div/)).toContain(TOUCH_FLOOR.height);
    const track = classesWhere(markup, /role="switch"/);
    expect(track).toEqual(expect.arrayContaining(["relative", "h-6", "w-10", `${FLOOR_PREFIX}after:absolute`, `${FLOOR_PREFIX}after:-inset-x-2`, `${FLOOR_PREFIX}after:-inset-y-3`]));
  });

  it("RowMenu: both kinds of item are floored", () => {
    const src = readSource("src/components/row-menu.tsx");
    expect(src).toContain('cn("flex items-center gap-1.5 px-3 py-1.5 text-sm text-ink hover:bg-surface", TOUCH_FLOOR.height)');
    expect(src).toMatch(/item\.danger \? "text-danger hover:bg-danger\/10" : "text-ink",\n\s*\/\/[^\n]*\n\s*TOUCH_FLOOR\.height\n/);
  });
});

describe("1.7.0 Grid: one explicit column below its breakpoint", () => {
  it("cols with from adds grid-cols-1 (minmax(0, 1fr)); without from, or without cols, nothing changes", () => {
    const cls = (el: ReactElement) => classesWhere(html(el), /^<[a-z]+/).sort();
    expect(cls(<Grid gap={4} cols={2} from="sm">x</Grid>)).toEqual(["gap-4", "grid", "grid-cols-1", "sm:grid-cols-2"]);
    expect(cls(<Grid gap={6} cols={2} from="lg" align="start">x</Grid>)).toEqual(["gap-6", "grid", "grid-cols-1", "items-start", "lg:grid-cols-2"]);
    expect(cls(<Grid gap={3} cols={2}>x</Grid>)).toEqual(["gap-3", "grid", "grid-cols-2"]);
    expect(cls(<Grid>x</Grid>)).toEqual(["grid"]);
    // A caller's own template still wins below the breakpoint (tailwind-merge).
    expect(cls(<Grid cols={2} from="sm" className="grid-cols-[1fr_auto]">x</Grid>)).toEqual(["grid", "grid-cols-[1fr_auto]", "sm:grid-cols-2"]);
  });
});
