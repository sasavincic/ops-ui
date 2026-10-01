import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppSwitcher } from "../src/components/app-switcher";
import { Tabs } from "../src/components/tabs";
import { OpsUiProvider } from "../src/config/provider";
import { EN_STRINGS } from "../src/config/strings";
import { OPS_APPS } from "../src/lib/apps";

// The AppSwitcher on the server (library 1.1.0, spec §10); its menu, keyboard and dismissal are
// browser behaviour (gallery/tests/behaviour.spec.ts). Also strings.tabs (spec §12.4).

describe("OPS_APPS (values decided 2026-10-01)", () => {
  it("three apps; FinaOps has no URL until it leaves the demo (end of 2026), so it is not listed", () => {
    expect(OPS_APPS).toEqual([
      { id: "workforce", name: "Workforce Ops", href: "https://workforce-ops.vercel.app", color: "#0b131e" },
      { id: "finaops", name: "FinaOps", href: null, color: "#083a25" },
      { id: "prefab", name: "PrefabOps", href: "https://prefab-ops-platform.vercel.app", color: "#092a48" },
    ]);
    for (const app of OPS_APPS) if (app.href) expect(app.href).toMatch(/^https:\/\/[^/]+$/);
  });
});

describe("AppSwitcher on the server", () => {
  const closed = renderToStaticMarkup(<AppSwitcher current="workforce" mark={<b>WFO</b>} />);

  it("the mark is a menu button named 'Switch app' plus the current app, closed", () => {
    expect(closed).toContain('aria-haspopup="menu"');
    expect(closed).toContain('aria-expanded="false"');
    expect(closed).toContain('aria-label="Switch app: Workforce Ops"');
    expect(closed).toContain("<b>WFO</b>");
    expect(closed).not.toContain('role="menu"');
  });

  it("the app's words replace the English defaults", () => {
    const sl = renderToStaticMarkup(
      <OpsUiProvider strings={{ ...EN_STRINGS, appSwitcher: { label: "Preklopi aplikacijo", current: "Trenutna aplikacija" } }}>
        <AppSwitcher current="prefab" mark="P" />
      </OpsUiProvider>,
    );
    expect(sl).toContain('aria-label="Preklopi aplikacijo: PrefabOps"');
  });

  it("a read-only scope never hides it (it changes no data): a plain <button>, not the kit Button", async () => {
    const { ReadOnlyScope } = await import("../src/config/read-only");
    expect(renderToStaticMarkup(<ReadOnlyScope readOnly><AppSwitcher current="workforce" mark="W" /></ReadOnlyScope>)).toContain(
      'aria-haspopup="menu"',
    );
  });
});

describe("Tabs: strings.tabs (1.1)", () => {
  const tabs = <Tabs items={[{ key: "a", label: "A" }]} active="a" hrefFor={(k) => `?tab=${k}`} />;

  it('names the nav "Tabs" by default, the 1.0 markup', () => {
    const html = renderToStaticMarkup(tabs);
    expect(html).toContain('<nav class="relative flex gap-1 overflow-x-auto overflow-y-hidden" aria-label="Tabs">');
    expect(renderToStaticMarkup(<OpsUiProvider strings={EN_STRINGS}>{tabs}</OpsUiProvider>)).toBe(html);
  });

  it("names it in the app's words when strings.tabs is passed", () => {
    expect(renderToStaticMarkup(<OpsUiProvider strings={{ ...EN_STRINGS, tabs: "Zavihki" }}>{tabs}</OpsUiProvider>)).toContain(
      'aria-label="Zavihki"',
    );
  });
});
