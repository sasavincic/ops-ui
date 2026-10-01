import { renderToStaticMarkup } from "react-dom/server";
import { createElement, type ReactElement, type ReactNode } from "react";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { afterAll, describe, expect, it } from "vitest";
import { ActionIconScope } from "../src/components/action-icon";
import { OpsUiProvider } from "../src/config/provider";
import { AppFrame } from "../src/shell/app-frame";
import { CommandPalette } from "../src/shell/command-palette";
import { MobileTopBar } from "../src/shell/mobile-top-bar";
import { PullToSearch } from "../src/shell/pull-to-search";
import { Sidebar } from "../src/shell/sidebar";
import { SignOutButton } from "../src/shell/sign-out-button";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ROOT } from "./source-files";
import {
  FIXTURE_COMMITS,
  readFixture,
  INTENTIONAL_DIFFERENCES,
  applyDifferences,
  importFrom,
  installGlobals,
  libraryProps,
  removeSandbox,
  sandboxApp,
  shellStrings,
  type AppKey,
  type StateRewrite,
} from "./shell-fixtures";

// 1.5.0 (styling programme §4.2): with an app's nav, words and mark, the library's shell renders
// the markup that app's own shell renders - the whole (app)/layout.tsx frame, each part, and the
// open drawer and palette - so each app can adopt AppFrame at 0 changed pixels. The app side is
// the raw file from tests/fixtures/shell-<app> (see shell-fixtures.tsx); the only differences
// allowed are INTENTIONAL_DIFFERENCES, each applied exactly as often as declared.

const sandboxes: string[] = [];
afterAll(() => sandboxes.forEach(removeSandbox));

const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} };

function render(node: ReactNode, pathname: string): string {
  return renderToStaticMarkup(
    <AppRouterContext.Provider value={router}>
      <PathnameContext.Provider value={pathname}>{node}</PathnameContext.Provider>
    </AppRouterContext.Provider>,
  );
}

type Layout = (p: { children: ReactNode }) => Promise<ReactElement>;
type AnyComponent = (p: Record<string, unknown>) => ReactNode;

async function loadApp(app: AppKey, rewrites: StateRewrite[] = []) {
  installGlobals(app);
  const root = sandboxApp(app, rewrites);
  sandboxes.push(root);
  const layout = (await importFrom<{ default: Layout }>(root, "layout.tsx")).default;
  const nav = await importFrom<Record<string, readonly { href: string; key: string; icon?: string }[]>>(root, "nav.ts");
  const sidebar = (await importFrom<{ Sidebar: AnyComponent }>(root, "sidebar.tsx")).Sidebar;
  const topBar = (await importFrom<{ MobileTopBar: AnyComponent }>(root, "mobile-top-bar.tsx")).MobileTopBar;
  const palette = (await importFrom<{ CommandPalette: AnyComponent }>(root, "command-palette.tsx")).CommandPalette;
  const pull = (await importFrom<{ PullToSearch: AnyComponent }>(root, "pull-to-search.tsx")).PullToSearch;
  const signOut = (await importFrom<{ SignOutButton: AnyComponent }>(root, "sign-out-button.tsx")).SignOutButton;
  let mark: ReactNode;
  if (app === "wfo") {
    // Workforce Ops' AppMark passes this node as the switcher's mark (shell/app-mark.tsx).
    mark = (
      <span className="flex items-center gap-2.5">
        <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent" />
        <span className="text-sm font-semibold tracking-tight text-sidebar-fg-active">Workforce Ops</span>
      </span>
    );
  } else {
    // FinaOps' BrandSwitcher passes this node (shell/brand.tsx), its BrandMark inside.
    const { BrandMark } = await importFrom<{ BrandMark: AnyComponent }>(root, "brand.tsx");
    mark = (
      <span className="flex items-center gap-2.5">
        <BrandMark />
        <span className="text-sm font-semibold tracking-tight text-sidebar-fg-active">FinaOps</span>
      </span>
    );
  }
  return { layout, nav, sidebar, topBar, palette, pull, signOut, props: libraryProps(app, nav, mark), strings: shellStrings(app) };
}

const PAGE = <p className="text-sm">The page</p>;

const OPEN_DRAWER: StateRewrite = { file: "mobile-top-bar.tsx", from: "const [open, setOpen] = useState(false);", to: "const [open, setOpen] = useState(true);" };
const OPEN_PALETTE: StateRewrite = { file: "command-palette.tsx", from: "const [open, setOpen] = useState(false);", to: "const [open, setOpen] = useState(true);" };
const TYPED_QUERY: StateRewrite = { file: "command-palette.tsx", from: 'const [query, setQuery] = useState("");', to: 'const [query, setQuery] = useState("an");' };

/** Each app: one active workspace, one active record, the Mac hints. */
const PATHS: Record<AppKey, { workspace: string; record: string; footer: string }> = {
  wfo: { workspace: "/operations", record: "/workers/42", footer: "/settings" },
  finaops: { workspace: "/review", record: "/transactions", footer: "/settings" },
};

describe.each(["wfo", "finaops"] as const)("the library shell renders %s's shell markup", (app) => {
  it(`fixtures are ${FIXTURE_COMMITS[app]}`, () => {
    expect(FIXTURE_COMMITS[app]).toMatch(/ [0-9a-f]{7}$/);
  });

  for (const where of ["workspace", "record", "footer"] as const) {
    it(`the whole frame, on a ${where} page (the app's (app)/layout.tsx)`, async () => {
      const a = await loadApp(app);
      const path = PATHS[app][where];
      const appHtml = render(await a.layout({ children: PAGE }), path);
      const children = app === "finaops" ? <ActionIconScope>{PAGE}</ActionIconScope> : PAGE;
      const afterMain = app === "wfo" ? <div data-assistant-launcher="" /> : undefined;
      const libHtml = render(
        <OpsUiProvider strings={a.strings}>
          <AppFrame {...a.props} afterMain={afterMain}>
            {children}
          </AppFrame>
        </OpsUiProvider>,
        path,
      );
      // The render is the real thing: every nav label, the active register, the page.
      for (const item of [...a.props.nav.workspaces, ...a.props.nav.records, ...(a.props.nav.tools ?? []), ...(a.props.nav.footer ?? [])]) {
        expect(appHtml).toContain(`>${item.label.replace(/&/g, "&amp;")}</a>`);
      }
      expect(appHtml).toContain({ workspace: "bg-accent/15", record: "bg-sidebar-active", footer: "bg-sidebar-active" }[where]);
      expect(appHtml).toContain("The page");
      expect(libHtml).toBe(applyDifferences(app, appHtml));
    });
  }

  it("the sidebar with the chord hints written for a Mac", async () => {
    const a = await loadApp(app);
    const appHtml = render(createElement(a.sidebar, { userName: "Ana Novak", userEmail: "ana.novak@example.com", initialIsMac: true }), PATHS[app].workspace);
    const libHtml = render(
      <OpsUiProvider strings={a.strings}>
        <Sidebar {...a.props} initialIsMac />
      </OpsUiProvider>,
      PATHS[app].workspace,
    );
    expect(appHtml).toContain("⌥1");
    expect(libHtml).toBe(applyDifferences(app, appHtml));
  });

  it("the phone top bar with the drawer open", async () => {
    const a = await loadApp(app, [OPEN_DRAWER]);
    const appHtml = render(createElement(a.topBar, { userName: "Ana Novak", userEmail: "ana.novak@example.com" }), PATHS[app].record);
    const libHtml = render(
      <OpsUiProvider strings={a.strings}>
        <MobileTopBar {...a.props} defaultDrawerOpen />
      </OpsUiProvider>,
      PATHS[app].record,
    );
    expect(appHtml).toContain('aria-expanded="true"');
    expect(libHtml).toBe(appHtml);
  });

  it("the palette open with nothing typed (the shortcuts)", async () => {
    const a = await loadApp(app, [OPEN_PALETTE]);
    const appHtml = render(createElement(a.palette, {}), PATHS[app].workspace);
    const { navigate, ...palette } = a.props.palette!;
    void navigate;
    const libHtml = render(
      <OpsUiProvider strings={a.strings}>
        <CommandPalette {...palette} navigate={paletteNavigateOf(a.props)} defaultOpen />
      </OpsUiProvider>,
      PATHS[app].workspace,
    );
    expect(appHtml).toContain('role="dialog"');
    expect(libHtml).toBe(appHtml);
  });

  it("the palette open with a query typed while the index loads (shortcut matches, the trailing row)", async () => {
    const a = await loadApp(app, [OPEN_PALETTE, TYPED_QUERY]);
    const appHtml = render(createElement(a.palette, {}), PATHS[app].workspace);
    const libHtml = render(
      <OpsUiProvider strings={a.strings}>
        <CommandPalette {...a.props.palette!} navigate={paletteNavigateOf(a.props)} defaultOpen defaultQuery="an" />
      </OpsUiProvider>,
      PATHS[app].workspace,
    );
    expect(appHtml).toContain("…");
    expect(libHtml).toBe(appHtml);
  });

  it("pull-to-search and the sign-out button", async () => {
    const a = await loadApp(app);
    const lib = (node: ReactNode) => render(<OpsUiProvider strings={a.strings}>{node}</OpsUiProvider>, "/");
    expect(lib(<PullToSearch />)).toBe(render(createElement(a.pull, {}), "/"));
    expect(lib(<SignOutButton onSignOut={() => {}} className="mt-2" />)).toBe(render(createElement(a.signOut, { className: "mt-2" }), "/"));
  });
});

/** The "Go to" list AppFrame derives: workspaces, records, footer. */
function paletteNavigateOf(props: { nav: { workspaces: readonly { href: string; label: string }[]; records: readonly { href: string; label: string }[]; footer?: readonly { href: string; label: string }[] } }) {
  return [...props.nav.workspaces, ...props.nav.records, ...(props.nav.footer ?? [])].map(({ href, label }) => ({ href, label }));
}

describe("the moved lib modules", () => {
  it.each(["keyboard", "pull-to-search", "pointer-intent"])("lib/%s.ts is both apps' file, verbatim under its provenance line", (name) => {
    const library = readFileSync(path.join(ROOT, "src/lib", `${name}.ts`), "utf8").split("\n");
    expect(library[0]).toMatch(/^\/\/ 1\.5\.0: moved whole from workforce-ops/);
    expect(library[1]).toBe("");
    const rest = library.slice(2).join("\n");
    for (const app of ["wfo", "finaops"] as const) expect(rest, app).toBe(readFixture(app, `lib-${name}.ts`));
  });
});

describe("the intentional differences", () => {
  it("are few, named and each explained", () => {
    expect(INTENTIONAL_DIFFERENCES.length).toBeLessThanOrEqual(3);
    for (const d of INTENTIONAL_DIFFERENCES) expect(d.why.length, d.from).toBeGreaterThan(40);
  });
});
