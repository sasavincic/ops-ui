import Link from "next/link";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { Cluster } from "../src/components/cluster";
import { Heading } from "../src/components/heading";
import { Stack } from "../src/components/stack";
import { TD, TH } from "../src/components/table";
import { Text } from "../src/components/text";
import { isExternalHref, TextLink } from "../src/components/text-link";
import { cn } from "../src/lib/cn";

// The 1.2.0 primitives (styling programme spec §4.4). Adopting one in an app is a
// 0-changed-pixel codemod: each call below must render the SAME element as the hand-written
// recipe beside it, with the same class set (order may differ, nothing else may). The recipes
// are the ones measured in Workforce Ops and FinaOps (counts in the spec).

/** The markup with every class attribute's tokens sorted, so only the class ORDER is ignored. */
const normalize = (html: string) =>
  html.replace(/class="([^"]*)"/g, (_, c: string) => `class="${c.split(/\s+/).filter(Boolean).sort().join(" ")}"`);
const same = (primitive: ReactElement, recipe: ReactElement) =>
  expect(normalize(renderToStaticMarkup(primitive))).toBe(normalize(renderToStaticMarkup(recipe)));
/** One case: the primitive, then the hand-written recipe it replaces. */
const pair = (primitive: ReactElement, recipe: ReactElement): [ReactElement, ReactElement] => [primitive, recipe];
const table = (cell: ReactElement) => (
  <table>
    <tbody>
      <tr>{cell}</tr>
    </tbody>
  </table>
);

describe("Text: one prop, one class", () => {
  const cases: [ReactElement, ReactElement][] = [
    pair(<Text as="p" size="detail" tone="muted">x</Text>, <p className="text-detail text-ink-muted">x</p>),
    pair(<Text size="detail" tone="muted">x</Text>, <span className="text-detail text-ink-muted">x</span>),
    pair(<Text as="p" size="detail" tone="secondary">x</Text>, <p className="text-detail text-ink-secondary">x</p>),
    pair(<Text as="p" size="body" tone="secondary">x</Text>, <p className="text-sm text-ink-secondary">x</p>),
    pair(<Text tone="muted">x</Text>, <span className="text-ink-muted">x</span>),
    pair(<Text as="p" size="body" tone="muted">x</Text>, <p className="text-sm text-ink-muted">x</p>),
    pair(<Text block size="detail" tone="muted">x</Text>, <span className="block text-detail text-ink-muted">x</span>),
    pair(<Text weight="medium" tone="ink">x</Text>, <span className="font-medium text-ink">x</span>),
    pair(<Text as="p" size="body" tone="ink">x</Text>, <p className="text-sm text-ink">x</p>),
    pair(<Text as="p" size="detail" weight="medium" tone="ink">x</Text>, <p className="text-detail font-medium text-ink">x</p>),
    pair(<Text as="p" size="body" weight="semibold" tone="ink">x</Text>, <p className="text-sm font-semibold text-ink">x</p>),
    pair(<Text block truncate size="detail" tone="muted">x</Text>, <span className="block truncate text-detail text-ink-muted">x</span>),
    pair(<Text block size="micro" tone="muted">x</Text>, <span className="block text-micro text-ink-muted">x</span>),
    pair(<Text weight="normal" tone="muted">x</Text>, <span className="font-normal text-ink-muted">x</span>),
    pair(<Text mono tone="ink">x</Text>, <span className="font-mono text-ink">x</span>),
    pair(<Text mono size="detail" tone="muted">x</Text>, <span className="font-mono text-detail text-ink-muted">x</span>),
    pair(<Text as="p" size="detail" tone="warning">x</Text>, <p className="text-detail text-warning">x</p>),
    pair(<Text size="detail" tone="danger">x</Text>, <span className="text-detail text-danger">x</span>),
    pair(<Text tone="success">x</Text>, <span className="text-success">x</span>),
    pair(<Text as="dt" tone="muted">x</Text>, <dt className="text-ink-muted">x</dt>),
    pair(<Text as="li" tone="secondary">x</Text>, <li className="text-ink-secondary">x</li>),
    pair(<Text as="div" size="detail" tone="muted" className="mt-1">x</Text>, <div className="mt-1 text-detail text-ink-muted">x</div>),
  ];
  it.each(cases.map((c, i) => [i, ...c] as const))("case %i renders the recipe", (_i, primitive, recipe) => same(primitive, recipe));

  it("no prop, no class attribute; other attributes pass through", () => {
    expect(renderToStaticMarkup(<Text>x</Text>)).toBe("<span>x</span>");
    expect(renderToStaticMarkup(<Text as="p" id="a" title="t" size="detail">x</Text>)).toBe('<p class="text-detail" id="a" title="t">x</p>');
  });

  it("a className of another group is kept beside the props (cn merges, never drops)", () => {
    expect(renderToStaticMarkup(<Text size="detail" tone="ink" className="text-white">x</Text>)).toContain("text-detail");
  });
});

describe("Heading", () => {
  it("each level renders its recipe on its default element", () => {
    same(<Heading level="title">x</Heading>, <h1 className="text-lg font-semibold tracking-tight text-ink">x</h1>);
    same(<Heading level="section">x</Heading>, <h2 className="text-sm font-semibold text-ink">x</h2>);
    same(<Heading level="subsection">x</Heading>, <h3 className="text-xs font-medium text-ink-secondary">x</h3>);
  });
  it("as overrides the element; id and className pass through", () => {
    same(
      <Heading level="section" as="h3" id="t" className="mb-2">x</Heading>,
      <h3 className="mb-2 text-sm font-semibold text-ink" id="t">x</h3>,
    );
  });
});

describe("Stack", () => {
  const cases: [ReactElement, ReactElement][] = [
    pair(<Stack gap={4}>x</Stack>, <div className="flex flex-col gap-4">x</div>),
    pair(<Stack gap={2}>x</Stack>, <div className="flex flex-col gap-2">x</div>),
    pair(<Stack gap={3}>x</Stack>, <div className="flex flex-col gap-3">x</div>),
    pair(<Stack gap={0.5}>x</Stack>, <div className="flex flex-col gap-0.5">x</div>),
    pair(<Stack gap={6}>x</Stack>, <div className="flex flex-col gap-6">x</div>),
    pair(<Stack gap={1.5}>x</Stack>, <div className="flex flex-col gap-1.5">x</div>),
    pair(<Stack gap={1}>x</Stack>, <div className="flex flex-col gap-1">x</div>),
    pair(<Stack gap={2.5}>x</Stack>, <div className="flex flex-col gap-2.5">x</div>),
    pair(<Stack gap={5}>x</Stack>, <div className="flex flex-col gap-5">x</div>),
    pair(<Stack>x</Stack>, <div className="flex flex-col">x</div>),
    pair(<Stack as="section" gap={3}>x</Stack>, <section className="flex flex-col gap-3">x</section>),
    pair(<Stack as="ul" gap={2}>x</Stack>, <ul className="flex flex-col gap-2">x</ul>),
    pair(<Stack as="form" gap={4} noValidate>x</Stack>, <form className="flex flex-col gap-4" noValidate>x</form>),
    pair(<Stack as="fieldset" gap={1.5}>x</Stack>, <fieldset className="flex flex-col gap-1.5">x</fieldset>),
    pair(<Stack as="span" gap={0.5}>x</Stack>, <span className="flex flex-col gap-0.5">x</span>),
    pair(<Stack gap={6} className="min-w-0">x</Stack>, <div className="flex flex-col gap-6 min-w-0">x</div>),
  ];
  it.each(cases.map((c, i) => [i, ...c] as const))("case %i renders the recipe", (_i, primitive, recipe) => same(primitive, recipe));
});

describe("Cluster", () => {
  const cases: [ReactElement, ReactElement][] = [
    pair(<Cluster gap={2}>x</Cluster>, <div className="flex flex-wrap items-center gap-2">x</div>),
    pair(<Cluster gap={2} justify="between">x</Cluster>, <div className="flex flex-wrap items-center justify-between gap-2">x</div>),
    pair(<Cluster as="span" gap={1} align="stretch" justify="end">x</Cluster>, <span className="flex flex-wrap justify-end gap-1">x</span>),
    pair(<Cluster gap={2} justify="end">x</Cluster>, <div className="flex flex-wrap items-center justify-end gap-2">x</div>),
    pair(<Cluster gap={1} align="stretch">x</Cluster>, <div className="flex flex-wrap gap-1">x</div>),
    pair(<Cluster gap={2} align="stretch" justify="end">x</Cluster>, <div className="flex flex-wrap justify-end gap-2">x</div>),
    pair(<Cluster gap={1.5} align="stretch">x</Cluster>, <div className="flex flex-wrap gap-1.5">x</div>),
    pair(<Cluster gap={4} align="start">x</Cluster>, <div className="flex flex-wrap items-start gap-4">x</div>),
    pair(<Cluster wrap={false} gap={2}>x</Cluster>, <div className="flex items-center gap-2">x</div>),
    pair(<Cluster wrap={false} gap={2} align="stretch" justify="end">x</Cluster>, <div className="flex gap-2 justify-end">x</div>),
    pair(<Cluster wrap={false} align="stretch" justify="end">x</Cluster>, <div className="flex justify-end">x</div>),
    pair(<Cluster wrap={false} gap={3} align="baseline" justify="between">x</Cluster>, <div className="flex items-baseline justify-between gap-3">x</div>),
    pair(<Cluster wrap={false} align="stretch" justify="center">x</Cluster>, <div className="flex justify-center">x</div>),
    pair(<Cluster wrap={false} gap={2} align="end">x</Cluster>, <div className="flex items-end gap-2">x</div>),
    pair(<Cluster as="li" wrap={false} gap={2}>x</Cluster>, <li className="flex items-center gap-2">x</li>),
    pair(<Cluster as="p" gap={2} className="text-detail">x</Cluster>, <p className="flex flex-wrap items-center gap-2 text-detail">x</p>),
  ];
  it.each(cases.map((c, i) => [i, ...c] as const))("case %i renders the recipe", (_i, primitive, recipe) => same(primitive, recipe));
});

describe("TextLink", () => {
  it("each variant renders the recipe it replaces on a next/link Link", () => {
    same(<TextLink variant="quiet" href="/a">x</TextLink>, <Link className="underline underline-offset-2 hover:text-ink" href="/a">x</Link>);
    same(<TextLink variant="underline" href="/a">x</TextLink>, <Link className="underline underline-offset-2" href="/a">x</Link>);
    same(<TextLink variant="primary" href="/a">x</TextLink>, <Link className="text-primary hover:underline" href="/a">x</Link>);
    same(<TextLink variant="primary" size="detail" href="/a">x</TextLink>, <Link className="text-detail text-primary hover:underline" href="/a">x</Link>);
    same(<TextLink variant="plain" href="/a">x</TextLink>, <Link className="hover:underline" href="/a">x</Link>);
    same(<TextLink variant="strong" href="/a">x</TextLink>, <Link className="font-medium text-ink hover:underline" href="/a">x</Link>);
  });
  it("an external address is a plain <a>; nothing is added", () => {
    expect(isExternalHref("https://example.com")).toBe(true);
    expect(isExternalHref("mailto:a@b.c")).toBe(true);
    expect(isExternalHref("tel:+386")).toBe(true);
    expect(isExternalHref("//cdn.example.com/x")).toBe(true);
    expect(isExternalHref("/workers/1")).toBe(false);
    expect(isExternalHref("#top")).toBe(false);
    expect(isExternalHref("?tab=pay")).toBe(false);
    same(
      <TextLink variant="quiet" href="https://example.com" target="_blank" rel="noopener noreferrer">x</TextLink>,
      <a href="https://example.com" className="underline underline-offset-2 hover:text-ink" target="_blank" rel="noopener noreferrer">x</a>,
    );
  });
});

describe("TH / TD column props (additive)", () => {
  const TH_BASE = "px-4 py-2.5 text-left text-xs font-medium text-ink-secondary";
  const TD_BASE = "px-4 py-3 align-middle text-ink";

  it("an unchanged call renders exactly as in 1.1", () => {
    for (const c of [undefined, "w-px", "text-right", "hidden sm:table-cell text-right"]) {
      expect(renderToStaticMarkup(table(<TH className={c}>x</TH>))).toContain(`<th class="${cn(TH_BASE, c)}">x</th>`);
      expect(renderToStaticMarkup(table(<TD className={c}>x</TD>))).toContain(`<td class="${cn(TD_BASE, c)}">x</td>`);
    }
  });

  const cases: [ReactElement, ReactElement][] = [
    pair(<TH hideBelow="sm">x</TH>, <TH className="hidden sm:table-cell">x</TH>),
    pair(<TH hideBelow="md">x</TH>, <TH className="hidden md:table-cell">x</TH>),
    pair(<TH hideBelow="lg">x</TH>, <TH className="hidden lg:table-cell">x</TH>),
    pair(<TH alignRight>x</TH>, <TH className="text-right">x</TH>),
    pair(<TH hideBelow="sm" alignRight>x</TH>, <TH className="hidden sm:table-cell text-right">x</TH>),
    pair(<TH hideBelow="md" alignRight>x</TH>, <TH className="hidden md:table-cell text-right">x</TH>),
    pair(<TD hideBelow="sm">x</TD>, <TD className="hidden sm:table-cell">x</TD>),
    pair(<TD hideBelow="md">x</TD>, <TD className="hidden md:table-cell">x</TD>),
    pair(<TD hideBelow="lg">x</TD>, <TD className="hidden lg:table-cell">x</TD>),
    pair(<TD alignRight>x</TD>, <TD className="text-right">x</TD>),
    pair(<TD hideBelow="sm" alignRight>x</TD>, <TD className="hidden sm:table-cell text-right">x</TD>),
    pair(<TD numeric>x</TD>, <TD className="font-mono text-right">x</TD>),
    pair(<TD numeric className="text-detail">x</TD>, <TD className="font-mono text-detail text-right">x</TD>),
    pair(<TD numeric hideBelow="sm">x</TD>, <TD className="font-mono hidden sm:table-cell text-right">x</TD>),
    pair(<TD numeric hideBelow="md" className="whitespace-nowrap">x</TD>, <TD className="font-mono hidden md:table-cell text-right whitespace-nowrap">x</TD>),
  ];
  it.each(cases.map((c, i) => [i, ...c] as const))("case %i equals the className it replaces", (_i, primitive, recipe) =>
    same(table(primitive), table(recipe)),
  );
});
