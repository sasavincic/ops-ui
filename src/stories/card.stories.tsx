"use client";

import { useLayoutEffect } from "react";
import { Button } from "../components/button";
import { Card, CardBody, CardHeader, CardTitle } from "../components/card";
import { Field, Input } from "../components/field";
import type { Story } from "./index";

/**
 * A legacy page's element rules, as PrefabOps' sheets write them (bare h2, p, ul, button), in a
 * layer below the reset: base's own sublayer here (portable to any app's /dev/kit), the legacy
 * layer in PrefabOps (restyle plan 5.1). Tokens only, and fonts inherited: a shot never paints a
 * host font.
 */
const LEGACY_CSS = `@layer base { @layer ops-legacy-fixture {
  .ops-legacy-fixture { padding: 16px; background: var(--color-surface); color: var(--color-ink-secondary); font-size: 15px; }
  .ops-legacy-fixture h2 { margin: 0 0 12px; font-size: 22px; font-weight: 700; color: var(--color-primary); }
  .ops-legacy-fixture p { margin: 0 0 12px; line-height: 1.4; }
  .ops-legacy-fixture ul { margin: 0 0 16px; padding: 0 0 0 20px; border-left: 3px solid var(--color-border-strong); }
  .ops-legacy-fixture button { margin: 0 8px 16px 0; padding: 8px 18px; border: 2px solid var(--color-border-strong); border-radius: 12px; background: var(--color-surface-raised); font: inherit; color: inherit; }
} }`;

/**
 * The PrefabOps coexistence case (restyle plan 5.3, library spec 13.2): a page WITHOUT the global
 * reset, whose legacy element rules sit in a lower layer, hosting a kit island. Inside
 * `.ops-ui-root`, styles/preflight-scoped.css (layer base) resets what the legacy rules set, so
 * the kit renders as everywhere else; outside it the legacy markup keeps its look. The gallery
 * turns its own global reset off for this story (`<html data-ops-preflight="scoped">`,
 * gallery/app/preflight-global.css); an app that has the global reset ignores the attribute.
 */
function IslandOnALegacyPage() {
  useLayoutEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-ops-preflight", "scoped");
    return () => html.removeAttribute("data-ops-preflight");
  }, []);
  return (
    <div className="ops-legacy-fixture max-w-3xl">
      <style>{LEGACY_CSS}</style>
      <h2>Legacy page</h2>
      <p>Legacy markup: its own element rules, no global reset.</p>
      <ul>
        <li>a bare list</li>
        <li>keeps its legacy indent</li>
      </ul>
      <button type="button">Legacy button</button>
      <div className="ops-ui-root">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-ink">Kit island</h2>
            <Button variant="ghost" size="sm" icon="edit">
              Edit
            </Button>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            <p className="text-sm text-ink-secondary">Inside .ops-ui-root the same element rules are reset.</p>
            <ul className="text-sm text-ink">
              <li>a bare list</li>
              <li>without the legacy indent</li>
            </ul>
            <Field label="Order number" htmlFor="island-order">
              <Input id="island-order" defaultValue="PO-2026-118" />
            </Field>
            <div className="flex gap-2">
              <Button variant="secondary">Cancel</Button>
              <Button icon="save">Save</Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export const stories: Story[] = [
  {
    name: "Solid and ghost",
    render: () => (
      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Employment</CardTitle>
            <Button variant="ghost" size="sm" icon="edit">
              Edit
            </Button>
          </CardHeader>
          <CardBody className="text-sm text-ink-secondary">Latro Mont d.o.o. since 01-08-2026, fixed term until 31-07-2027.</CardBody>
        </Card>
        <Card variant="ghost">
          <CardBody className="text-sm text-ink-muted">An unfilled seat: the ghost card is a dashed placeholder.</CardBody>
        </Card>
      </div>
    ),
  },
  { name: "Island on a legacy page", render: () => <IslandOnALegacyPage /> },
];
