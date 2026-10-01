import Link from "next/link";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { ReadOnlyScope } from "../src/config/read-only";
import { Checkbox } from "../src/components/field";
import { Grid } from "../src/components/grid";
import { ChoiceTile, Radio, RadioGroup } from "../src/components/radio";
import { SplitLayout } from "../src/components/split-layout";
import { TagRemove } from "../src/components/tag-remove";
import { Tag } from "../src/components/tag";
import { Text } from "../src/components/text";
import { TextButton } from "../src/components/text-button";
import { TextLink } from "../src/components/text-link";
import { cn } from "../src/lib/cn";

// The 1.6.0 additions (styling programme spec §4.6). As tests/primitives.test.tsx for 1.2.0: each
// call renders the SAME element as the hand-written app recipe beside it, with the same class set
// (class order ignored, nothing else). The recipes are copied from Workforce Ops a5cd0e4 and
// FinaOps 526d1a7 (file named per case); where a component writes its attributes in another order
// than the app did, the recipe is written in the component's order (the DOM is the same).

const normalize = (html: string) =>
  html.replace(/class="([^"]*)"/g, (_, c: string) => `class="${c.split(/\s+/).filter(Boolean).sort().join(" ")}"`);
const html = (node: ReactElement) => normalize(renderToStaticMarkup(node));
const same = (primitive: ReactElement, recipe: ReactElement) => expect(html(primitive)).toBe(html(recipe));
const pair = (name: string, primitive: ReactElement, recipe: ReactElement): [string, ReactElement, ReactElement] => [name, primitive, recipe];
const noop = () => {};

describe("TextButton: a <button> with TextLink's classes, size and tone", () => {
  const cases = [
    pair(
      "WFO deployments-tab (exact): quiet, detail, muted",
      <TextButton type="button" variant="quiet" size="detail" tone="muted">Show history</TextButton>,
      <button className="text-detail text-ink-muted underline underline-offset-2 hover:text-ink" type="button">Show history</button>,
    ),
    pair(
      "WFO flightboard: quiet, secondary, self-start",
      <TextButton type="button" variant="quiet" tone="secondary" className="self-start">Undo</TextButton>,
      <button className="self-start text-ink-secondary underline underline-offset-2 hover:text-ink" type="button">Undo</button>,
    ),
    pair(
      "WFO quote-editor: quiet, detail, muted + layout",
      <TextButton type="button" variant="quiet" size="detail" tone="muted" className="col-span-3 ml-5 justify-self-start py-1 text-left">+ alternative rate</TextButton>,
      <button className="col-span-3 ml-5 justify-self-start py-1 text-left text-detail text-ink-muted underline underline-offset-2 hover:text-ink" type="button">+ alternative rate</button>,
    ),
    pair(
      "WFO prospect-sheet: underline, detail, danger + hover fade",
      <TextButton type="button" variant="underline" size="detail" tone="danger" className="py-2 -my-2 hover:opacity-80">Delete lead</TextButton>,
      <button className="py-2 -my-2 text-detail text-danger underline underline-offset-2 hover:opacity-80" type="button">Delete lead</button>,
    ),
    pair(
      "WFO new-subcontractor: underline, detail, primary colour in className",
      <TextButton type="button" variant="underline" size="detail" className="self-start text-primary hover:opacity-80">New subcontractor</TextButton>,
      <button className="self-start text-detail text-primary underline underline-offset-2 hover:opacity-80" type="button">New subcontractor</button>,
    ),
    pair(
      "WFO scan-control: plain, micro, muted",
      <TextButton type="button" variant="plain" size="micro" tone="muted" className="underline-offset-2 hover:text-ink disabled:opacity-50">Replace</TextButton>,
      <button className="text-micro text-ink-muted underline-offset-2 hover:text-ink hover:underline disabled:opacity-50" type="button">Replace</button>,
    ),
    pair(
      "WFO / FinaOps two-factor: muted, detail",
      <TextButton type="button" variant="muted" size="detail" className="py-2 text-center hover:underline">Use a backup code</TextButton>,
      <button className="py-2 text-center text-detail text-ink-secondary hover:text-primary hover:underline" type="button">Use a backup code</button>,
    ),
    pair(
      "FinaOps rules-board: strong",
      <TextButton type="button" variant="strong" className="text-left">Fuel cards</TextButton>,
      <button className="text-left font-medium text-ink hover:underline" type="button">Fuel cards</button>,
    ),
  ];
  it.each(cases)("%s", (_name, primitive, recipe) => same(primitive, recipe));

  it("hidden in a read-only scope unless readOnlySafe; no default type", () => {
    expect(renderToStaticMarkup(<ReadOnlyScope readOnly><TextButton variant="quiet">x</TextButton></ReadOnlyScope>)).toBe("");
    expect(renderToStaticMarkup(<ReadOnlyScope readOnly><TextButton variant="quiet" readOnlySafe>x</TextButton></ReadOnlyScope>)).toContain(">x</button>");
    expect(renderToStaticMarkup(<TextButton variant="plain">x</TextButton>)).not.toContain("type=");
  });
});

describe("TextLink: the muted variant", () => {
  it.each([
    pair("FinaOps login (+className)", <TextLink variant="muted" href="/forgot" className="text-center">Forgot?</TextLink>, <Link href="/forgot" className="text-center text-ink-secondary hover:text-primary">Forgot?</Link>),
    pair("WFO login (+className)", <TextLink variant="muted" href="/password" className="py-2 text-center">Forgot?</TextLink>, <Link href="/password" className="py-2 text-center text-ink-secondary hover:text-primary">Forgot?</Link>),
  ])("%s", (_name, primitive, recipe) => same(primitive, recipe));
});

describe("Radio, RadioGroup, ChoiceTile", () => {
  it("Radio is the kit Checkbox's markup with a round mark (WFO travel-dialogs, exact)", () => {
    same(
      <Radio label="Book a bed" checked onChange={noop} />,
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="radio" className="size-4 accent-primary" checked onChange={noop} />
        Book a bed
      </label>,
    );
    // The same wrapper as Checkbox, so a form mixing both lines up.
    const radio = html(<Radio label="x" />).replace('type="radio"', 'type="checkbox"');
    expect(radio).toBe(html(<Checkbox label="x" />));
  });

  it("disabled or in a read-only scope: muted and not allowed, like Checkbox", () => {
    const recipe = (
      <label className="flex items-center gap-2 text-sm cursor-not-allowed text-ink-muted">
        <input type="radio" className="size-4 accent-primary" disabled />
        x
      </label>
    );
    same(<Radio label="x" disabled />, recipe);
    same(<ReadOnlyScope readOnly><Radio label="x" /></ReadOnlyScope>, recipe);
    expect(renderToStaticMarkup(<ReadOnlyScope readOnly><Radio label="x" readOnlySafe /></ReadOnlyScope>)).not.toContain("disabled");
  });

  it("RadioGroup: the Stack / Cluster recipe with role=radiogroup, and it names, checks and wires its radios", () => {
    let picked = "";
    const group = (
      <RadioGroup name="credit" value="partial" onChange={(v) => (picked = v)} orientation="vertical" gap={2} className="text-sm" aria-label="Credit">
        <Radio value="full" label="In full" />
        <Radio value="partial" label="Part of it" />
      </RadioGroup>
    );
    same(
      group,
      <div role="radiogroup" className="flex flex-col gap-2 text-sm" aria-label="Credit">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="radio" className="size-4 accent-primary" value="full" name="credit" checked={false} onChange={noop} />
          In full
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="radio" className="size-4 accent-primary" value="partial" name="credit" checked onChange={noop} />
          Part of it
        </label>
      </div>,
    );
    expect(picked).toBe("");
    same(
      <RadioGroup orientation="horizontal" gap={4} className="text-sm"><span /></RadioGroup>,
      <div role="radiogroup" className="flex flex-wrap gap-4 text-sm"><span /></div>,
    );
    same(
      <RadioGroup as="fieldset" orientation="horizontal" gap={2} className="min-w-0" disabled={false}><span /></RadioGroup>,
      <fieldset role="radiogroup" className="flex flex-wrap gap-2 min-w-0" disabled={false}><span /></fieldset>,
    );
  });

  // The second string of each app tile's cn(), word for word.
  const HAS =
    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60";
  const ON = "border-primary bg-primary-subtle text-primary";
  const OFF = "border-border-strong hover:bg-surface";

  it.each([
    pair(
      "WFO employer-picker (row): picked",
      <ChoiceTile name="employer" value="company:1" checked onChange={noop}>
        <span>Latro Mont</span>
      </ChoiceTile>,
      <label className={cn("flex min-h-11 min-w-0 cursor-pointer items-center gap-2 rounded-control border px-3 py-2 text-sm transition-colors", HAS, ON)}>
        <input type="radio" className="sr-only" name="employer" value="company:1" checked onChange={noop} />
        <span>Latro Mont</span>
      </label>,
    ),
    pair(
      "WFO employer-picker (row): not picked, with a title",
      <ChoiceTile title="Not employed yet" name="employer" value="none" checked={false} onChange={noop}>
        <span>🐦</span>
      </ChoiceTile>,
      <label title="Not employed yet" className={cn("flex min-h-11 min-w-0 cursor-pointer items-center gap-2 rounded-control border px-3 py-2 text-sm transition-colors", HAS, OFF)}>
        <input type="radio" className="sr-only" name="employer" value="none" checked={false} onChange={noop} />
        <span>🐦</span>
      </label>,
    ),
    pair(
      "WFO quote-editor issuer (compact)",
      <ChoiceTile layout="compact" title="Vantus d.o.o." name="quote-issuer" value="2" checked onChange={noop}>
        <span>VA</span>
      </ChoiceTile>,
      <label title="Vantus d.o.o." className={cn("flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-control border px-2.5 py-2 text-detail transition-colors sm:min-h-10 sm:justify-start", HAS, ON)}>
        <input type="radio" className="sr-only" name="quote-issuer" value="2" checked onChange={noop} />
        <span>VA</span>
      </label>,
    ),
    pair(
      "WFO quote-editor type (stacked), with the radio's aria-label",
      <ChoiceTile layout="stacked" title="Agency work" name="quote-type" value="agency" checked={false} aria-label="Agency — Agency work" onChange={noop}>
        <span>Agency</span>
      </ChoiceTile>,
      <label title="Agency work" className={cn("flex min-h-11 min-w-0 cursor-pointer flex-col justify-center gap-0.5 rounded-control border px-2.5 py-2 text-center text-detail transition-colors sm:min-h-0 sm:text-left", HAS, OFF)}>
        <input type="radio" className="sr-only" name="quote-type" value="agency" checked={false} aria-label="Agency — Agency work" onChange={noop} />
        <span>Agency</span>
      </label>,
    ),
  ])("%s", (_name, primitive, recipe) => same(primitive, recipe));

  it("ChoiceTile in a RadioGroup takes name, checked and onChange from it; read-only disables the radio", () => {
    const out = renderToStaticMarkup(
      <RadioGroup name="t" value="b" onChange={noop} orientation="horizontal" gap={2}>
        <ChoiceTile value="a">A</ChoiceTile>
        <ChoiceTile value="b">B</ChoiceTile>
      </RadioGroup>,
    );
    expect(out.match(/name="t"/g)).toHaveLength(2);
    expect(out.match(/checked=""/g)).toHaveLength(1);
    expect(out).toMatch(/<input[^>]*checked=""[^>]*value="b"/);
    expect(out.match(/bg-primary-subtle/g)).toHaveLength(1);
    expect(renderToStaticMarkup(<ReadOnlyScope readOnly><ChoiceTile value="a">A</ChoiceTile></ReadOnlyScope>)).toContain('disabled=""');
  });
});

describe("Checkbox without a label: the bare selection box", () => {
  it("FinaOps review-board (exact)", () => {
    same(
      <Checkbox aria-label="Select line" checked onChange={noop} />,
      <input type="checkbox" className="size-4 accent-primary" aria-label="Select line" checked onChange={noop} />,
    );
  });
  it("className styles the box; a labelled Checkbox is unchanged", () => {
    same(<Checkbox aria-label="x" className="mt-0.5" />, <input type="checkbox" className="mt-0.5 size-4 accent-primary" aria-label="x" />);
    same(
      <Checkbox label="Signature block" />,
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" className="size-4 accent-primary" />
        Signature block
      </label>,
    );
    expect(renderToStaticMarkup(<ReadOnlyScope readOnly><Checkbox aria-label="x" /></ReadOnlyScope>)).toContain('disabled=""');
  });
});

// 1.7.0: a Grid with `from` adds grid-cols-1 below its breakpoint (an explicit minmax(0, 1fr)
// column instead of the implicit auto track), so each `from` recipe below carries it. Where the
// content fits, the column is as wide as before (every grid baseline unchanged); where a child's
// content was wider than the phone, the page no longer scrolls sideways.
describe("SplitLayout and Grid", () => {
  it.each([
    pair("WFO worksite-form etc. (exact, 7)", <SplitLayout>m</SplitLayout>, <div className="grid items-start gap-6 lg:grid-cols-[1fr_minmax(20rem,26rem)]">m</div>),
    pair(
      "WFO invoice-builder: another side width replaces the template",
      <SplitLayout className="lg:grid-cols-[1fr_minmax(20rem,28rem)]">m</SplitLayout>,
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_minmax(20rem,28rem)]">m</div>,
    ),
    pair("as a form", <SplitLayout as="form">m</SplitLayout>, <form className="grid items-start gap-6 lg:grid-cols-[1fr_minmax(20rem,26rem)]">m</form>),
    pair("gap-3 sm:grid-cols-2 (34 / 10)", <Grid gap={3} cols={2} from="sm">x</Grid>, <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">x</div>),
    pair("gap-4 sm:grid-cols-2 (21 / 3)", <Grid gap={4} cols={2} from="sm">x</Grid>, <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">x</div>),
    pair("+ max-w-2xl (5 / 3)", <Grid gap={4} cols={2} from="sm" className="max-w-2xl">x</Grid>, <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">x</div>),
    pair("gap-3 grid-cols-2 (7 / 2)", <Grid gap={3} cols={2}>x</Grid>, <div className="grid grid-cols-2 gap-3">x</div>),
    pair("gap-6 items-start lg:grid-cols-2 (6 / 5)", <Grid gap={6} cols={2} from="lg" align="start">x</Grid>, <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">x</div>),
    pair("gap-3 sm:grid-cols-3", <Grid as="section" gap={3} cols={3} from="sm">x</Grid>, <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">x</section>),
    pair("no prop, just grid", <Grid>x</Grid>, <div className="grid">x</div>),
  ])("%s", (_name, primitive, recipe) => same(primitive, recipe));
});

describe("TagRemove", () => {
  it("FinaOps allocation-editor (exact)", () => {
    same(
      <Tag className="pr-1">
        VA-2026-0041
        <TagRemove label="Remove invoice VA-2026-0041" onClick={noop} />
      </Tag>,
      <Tag className="pr-1">
        VA-2026-0041
        <button type="button" aria-label="Remove invoice VA-2026-0041" className="shrink-0 rounded-control px-1.5 text-ink-muted hover:bg-surface-raised hover:text-ink" onClick={noop}>
          ✕
        </button>
      </Tag>,
    );
  });
  it("hidden in a read-only scope unless readOnlySafe", () => {
    expect(renderToStaticMarkup(<ReadOnlyScope readOnly><TagRemove label="x" /></ReadOnlyScope>)).toBe("");
    expect(renderToStaticMarkup(<ReadOnlyScope readOnly><TagRemove label="x" readOnlySafe /></ReadOnlyScope>)).toContain("✕");
  });
});

describe("Text: nowrap and tabular", () => {
  it.each([
    pair("text-detail whitespace-nowrap (3 / 7)", <Text size="detail" nowrap>01-10-2026</Text>, <span className="text-detail whitespace-nowrap">01-10-2026</span>),
    pair("font-mono text-detail whitespace-nowrap (4)", <Text mono size="detail" nowrap>VA-2026</Text>, <span className="font-mono text-detail whitespace-nowrap">VA-2026</span>),
    pair("font-medium whitespace-nowrap (4)", <Text weight="medium" nowrap>x</Text>, <span className="font-medium whitespace-nowrap">x</span>),
    pair("block text-micro text-ink-muted whitespace-nowrap (3)", <Text block size="micro" tone="muted" nowrap>x</Text>, <span className="block text-micro text-ink-muted whitespace-nowrap">x</span>),
    pair("tabular-nums (WFO 10 as className)", <Text tabular>12,5</Text>, <span className="tabular-nums">12,5</span>),
    pair("tabular-nums text-detail (FinaOps)", <Text size="detail" tabular>12,5</Text>, <span className="tabular-nums text-detail">12,5</span>),
    pair("font-mono tabular-nums", <Text mono tabular>12,5</Text>, <span className="font-mono tabular-nums">12,5</span>),
  ])("%s", (_name, primitive, recipe) => same(primitive, recipe));
});
