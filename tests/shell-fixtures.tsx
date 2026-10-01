import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ReactNode } from "react";
import { ChatGlyph, ListGlyph, type PaletteSection } from "../src/shell/command-palette";
import type { AppFrameProps } from "../src/shell/app-frame";
import type { NavIconName } from "../src/shell/nav-icon";
import type { ShellNavItem } from "../src/shell/nav";
import { EN_OPTIONAL_STRINGS, EN_STRINGS, type OpsUiStrings } from "../src/config/strings";
import { fmt } from "../src/lib/fmt";
import { normalizeSearchText } from "../src/lib/text";
import { ROOT } from "./source-files";

// The two apps' shells, raw, for the 1.5.0 markup proofs (tests/shell-markup.test.tsx on the
// server, tests/shell-behaviour.test.tsx in a DOM). tests/fixtures/shell-wfo is workforce-ops
// origin/main 96b4c7a, tests/fixtures/shell-finaops fina-ops origin/main 6182202, byte for byte:
// src/components/shell/*, src/app/(app)/layout.tsx, the en shell dictionary and the three lib
// modules the shell uses. Each file is written into a sandbox with ONLY its import specifiers
// rewritten (every `@/…` to a stub or a library module, `next/headers` to a stub); the declared
// state rewrites (STATE_REWRITES) open a drawer or a palette on the server, where no effect runs.

export type AppKey = "wfo" | "finaops";

export const FIXTURE_COMMITS: Record<AppKey, string> = { wfo: "workforce-ops 96b4c7a", finaops: "fina-ops 6182202" };

const lib = (p: string) => path.join(ROOT, "src", p);

/** What every `@/…` the shells import becomes. A spec missing here fails the load. */
function importMap(): Record<string, string> {
  const shell = (name: string) => `./${name}`;
  return {
    "@/components/shell/app-mark": shell("app-mark"),
    "@/components/shell/brand": shell("brand"),
    "@/components/shell/command-palette": shell("command-palette"),
    "@/components/shell/mobile-top-bar": shell("mobile-top-bar"),
    "@/components/shell/nav": shell("nav"),
    "@/components/shell/nav-trail": shell("nav-trail"),
    "@/components/shell/pull-to-search": shell("pull-to-search"),
    "@/components/shell/sidebar": shell("sidebar"),
    "@/components/shell/sign-out-button": shell("sign-out-button"),
    "@/components/shell/use-readable-nav": shell("use-readable-nav"),
    "@/components/shell/action-icon-route-scope": "./stub-route-scope",
    "@/lib/keyboard": "./lib-keyboard",
    "@/lib/pull-to-search": "./lib-pull-to-search",
    "@/lib/pointer-intent": "./lib-pointer-intent",
    // Both apps' lib/utils re-export the kit's cn (the vendored lib/cn.ts).
    "@/lib/utils": lib("lib/cn"),
    // Both apps' component wrappers re-export the vendored modules.
    "@/components/ui/search-input": lib("components/search-input"),
    "@/components/ui/state-mark": lib("components/state-mark"),
    "@/components/ui/badge": lib("components/badge"),
    "@/components/ui/app-switcher": lib("components/app-switcher"),
    "@/components/ui/action-icon": lib("components/action-icon"),
    "@/vendor/ops-ui/navigation/nav-trail": lib("navigation/nav-trail"),
    "@/i18n/locales": lib("lib/fmt"),
    "@/i18n/client": "./stub-i18n-client",
    "@/i18n/dictionaries/types": "./stub-types",
    "@/i18n": "./stub-i18n",
    "@/actions/search": "./stub-search-action",
    "@/domain/search": "./stub-search",
    "@/domain/permissions": "./stub-types",
    "@/components/permissions-provider": "./stub-permissions",
    "@/components/vocabulary-provider": "./stub-providers",
    "@/components/assistant/assistant-launcher": "./stub-assistant",
    "@/lib/auth-client": "./stub-auth",
    "@/lib/session": "./stub-session",
    "@/queries/professions": "./stub-session",
  };
}

const STUBS: Record<string, string> = {
  "stub-types.ts": `export type Dict = any; export type PermissionArea = string;\n`,
  "stub-i18n-client.tsx": `export function useDict() { return (globalThis as any).__shellDict; }
export function I18nProvider({ children }: { children: React.ReactNode }) { return <>{children}</>; }\n`,
  "stub-i18n.ts": `export async function getT() { return (globalThis as any).__shellDict; }
export async function getLocale() { return "en"; }\n`,
  "stub-search-action.ts": `export async function loadSearchIndex() { return (globalThis as any).__shellIndex; }\n`,
  // The apps' ranking stands in as one shared stub (the library side is fed the same function):
  // the proof is about the shell around the ranking, not the ranking.
  "stub-search.ts": `export { normalizeSearchText } from ${JSON.stringify(lib("lib/text"))};
export type SearchEntry = any; export type SearchKind = any;
export function rankSearchEntries(query: string, entries: any[]) { return (globalThis as any).__shellRank(query, entries); }\n`,
  "stub-permissions.tsx": `const yes = () => true;
export function useCanWriteFn() { return yes; }
export function useCanReadFn() { return yes; }
export function PermissionsProvider({ children }: { children: React.ReactNode }) { return <>{children}</>; }\n`,
  "stub-providers.tsx": `export function VocabularyProvider({ children }: { children: React.ReactNode }) { return <>{children}</>; }\n`,
  "stub-route-scope.tsx": `export function RouteActionIconScope({ children }: { children: React.ReactNode }) { return <>{children}</>; }\n`,
  "stub-assistant.tsx": `export function AssistantLauncher() { return <div data-assistant-launcher="" />; }\n`,
  "stub-auth.ts": `export const authClient = { signOut: async () => {} };\n`,
  "stub-session.ts": `export async function requireSession() { return { user: { name: "Ana Novak", email: "ana.novak@example.com" } }; }
export async function writableAreas() { return { areas: [], adminTools: false }; }
export async function readableAreas() { return []; }
export async function listActiveProfessionNames() { return []; }\n`,
  "stub-headers.ts": `export async function headers() { return new Map([["user-agent", (globalThis as any).__shellUserAgent ?? "Mozilla/5.0 (X11; Linux x86_64)"]]); }\n`,
};

/**
 * Test-only state rewrites, each anchored to exactly one line of the raw file: the server render
 * runs no effect and no event, so an open drawer or palette is reached by starting the state
 * open (the library side passes defaultDrawerOpen / defaultOpen / defaultQuery instead).
 */
export type StateRewrite = { file: string; from: string; to: string };

const fixtureDir = (app: AppKey) => path.join(ROOT, "tests/fixtures", app === "wfo" ? "shell-wfo" : "shell-finaops");

export const readFixture = (app: AppKey, file: string) => readFileSync(path.join(fixtureDir(app), `${file}.txt`), "utf8");

/** Writes one app's shell into a fresh sandbox folder and returns its path. */
export function sandboxApp(app: AppKey, rewrites: readonly StateRewrite[] = []): string {
  const root = mkdtempSync(path.join(os.tmpdir(), `ops-ui-shell-${app}-`));
  symlinkSync(path.join(ROOT, "node_modules"), path.join(root, "node_modules"), "dir");
  const dir = path.join(root, "app");
  mkdirSync(dir);
  const map = importMap();
  for (const name of readdirSync(fixtureDir(app))) {
    if (!name.endsWith(".txt") || name.startsWith("en-")) continue;
    const file = name.slice(0, -4);
    let source = readFileSync(path.join(fixtureDir(app), name), "utf8");
    source = source.replace(/from "(@\/[^"]+)";/g, (_, spec: string) => {
      const target = map[spec];
      if (!target) throw new Error(`${app}/${file}: unmapped import ${spec}`);
      return `from ${JSON.stringify(target)};`;
    });
    source = source.replace(/from "next\/headers";/g, 'from "./stub-headers";');
    for (const rewrite of rewrites.filter((r) => r.file === file)) {
      const count = source.split(rewrite.from).length - 1;
      if (count !== 1) throw new Error(`${app}/${file}: rewrite anchor found ${count} times: ${rewrite.from}`);
      source = source.replace(rewrite.from, rewrite.to);
    }
    writeFileSync(path.join(dir, file), source);
  }
  for (const [name, source] of Object.entries(STUBS)) writeFileSync(path.join(dir, name), source);
  return root;
}

export const removeSandbox = (root: string) => rmSync(root, { recursive: true, force: true });

export async function importFrom<T>(root: string, file: string): Promise<T> {
  return (await import(/* @vite-ignore */ path.join(root, "app", file))) as T;
}

/** The app's en `shell` dictionary (the fixture file is a plain `export const shell = {…} as const;`). */
export function shellWords(app: AppKey): Record<string, unknown> {
  const source = readFixture(app, "en-shell.ts").replace(/^export const shell = /m, "return ").replace(/ as const;\s*$/, ";");
  return new Function(source)() as Record<string, unknown>;
}

/** The dictionary the stubs hand out: shell + the create-shortcut labels the palettes read. */
export function appDict(app: AppKey) {
  const shell = shellWords(app);
  return app === "wfo"
    ? {
        shell,
        workers: { list: { newWorker: "New worker" } },
        clients: { newClient: "New client" },
        worksites: { newWorksite: "New worksite" },
        companies: { newCompany: "New company" },
        subcontractors: { newSubcontractor: "New subcontractor" },
        accommodations: { newAccommodation: "New accommodation" },
        vehicles: { newVehicle: "New vehicle" },
      }
    : {
        shell,
        statements: { newImport: "Import statement" },
        rules: { newRule: "New rule" },
        setup: { accounts: { newAccount: "New bank account" } },
      };
}

/** The kit's shell words picked from the app's dictionary: what an app's pickKitStrings will pass. */
export function shellStrings(app: AppKey): OpsUiStrings {
  const s = shellWords(app) as Record<string, string>;
  const shell: NonNullable<OpsUiStrings["shell"]> = {
    search: s.search,
    records: s.records,
    tools: s.tools ?? EN_OPTIONAL_STRINGS.shell.tools,
    openMenu: s.openMenu,
    closeMenu: s.closeMenu,
    signOut: s.signOut,
    pullToSearch: s.pullToSearch,
    releaseToSearch: s.releaseToSearch,
    closeSearch: s.closeSearch,
    searchPlaceholder: s.searchPlaceholder,
    searchEmptyHint: s.searchEmptyHint,
    searchNoResults: s.searchNoResults,
    searchNavigate: s.searchNavigate,
    searchCreate: s.searchCreate,
  };
  return { ...EN_STRINGS, shell };
}

/** The app's section names mapped onto the library's glyphs (what each app's adoption writes). */
export const ICONS: Record<AppKey, Record<string, NavIconName>> = {
  wfo: {
    operations: "board",
    compliance: "shield-check",
    invoicing: "receipt",
    outreach: "paper-plane",
    logistics: "truck",
    recruiting: "person-plus",
    documents: "document",
  },
  finaops: {
    review: "tray-check",
    invoicing: "invoice",
    close: "calendar-check",
    reports: "report",
    analysis: "bars",
    insights: "bulb",
  },
};

/** A search index in the shape both apps' entries share (their own kinds), and the ranking stub. */
export function indexFor(app: AppKey) {
  const [person, place] = app === "wfo" ? ["worker", "worksite"] : ["counterparty", "account"];
  return [
    { kind: person, id: "1", title: "Ana Novak", subtitle: "Welder TIG · Augsburg", statusLabel: null, statusVariant: null, href: "/x/1" },
    { kind: person, id: "2", title: "Anton Kos", subtitle: null, statusLabel: "Archived", statusVariant: "neutral", statusIcon: "archive", href: "/x/2" },
    { kind: place, id: "3", title: "Annex works", subtitle: "Graz", statusLabel: null, statusVariant: null, href: "/y/3" },
  ] as IndexEntry[];
}

export type IndexEntry = {
  kind: string;
  id: string;
  title: string;
  subtitle: string | null;
  statusLabel: string | null;
  statusVariant: string | null;
  statusIcon?: string;
  href: string;
};

export function rank(query: string, entries: readonly IndexEntry[]) {
  const q = normalizeSearchText(query);
  const groups: { kind: string; entries: IndexEntry[] }[] = [];
  for (const entry of entries) {
    if (!normalizeSearchText(entry.title).includes(q)) continue;
    const group = groups.find((g) => g.kind === entry.kind) ?? groups[groups.push({ kind: entry.kind, entries: [] }) - 1];
    group.entries.push(entry);
  }
  return groups;
}

/** The app's kind header, as its own palette reads it (WFO t.shell[...], FinaOps t.shell.searchKinds[kind]). */
export function kindHeader(app: AppKey, kind: string): string {
  const shell = shellWords(app) as Record<string, unknown>;
  if (app === "wfo") return shell[kind === "worker" ? "workers" : "worksites"] as string;
  return (shell.searchKinds as Record<string, string>)[kind];
}

/** What an app's adoption passes as `search`: its ranking, mapped onto the library's sections. */
export function librarySearch(app: AppKey) {
  return (query: string, index: readonly IndexEntry[]): PaletteSection[] =>
    rank(query, index).map((group) => ({
      header: kindHeader(app, group.kind),
      entries: group.entries.map((entry) => ({
        key: `${entry.kind}:${entry.id}`,
        href: entry.href,
        title: entry.title,
        subtitle: entry.subtitle,
        status:
          entry.statusLabel && entry.statusIcon
            ? { label: entry.statusLabel, icon: entry.statusIcon as never, tone: entry.statusVariant as never }
            : null,
      })),
    }));
}

/** Installs what the stubs read: the dictionary, the index, the ranking. */
export function installGlobals(app: AppKey) {
  const g = globalThis as Record<string, unknown>;
  g.__shellDict = appDict(app);
  g.__shellIndex = indexFor(app);
  g.__shellRank = rank;
}

type NavModule = Record<string, readonly { href: string; key: string; icon?: string }[]>;

/**
 * The library's props for one app, built from the app's own nav.ts and dictionary exactly as
 * its adoption will: labels from t.shell[key], glyphs through ICONS, the read filter already
 * applied (here: everything readable, as the stubs answer).
 */
export function libraryProps(app: AppKey, navModule: NavModule, mark: ReactNode): Omit<AppFrameProps<readonly IndexEntry[]>, "children"> {
  const shell = shellWords(app) as Record<string, string>;
  const item = (entry: { href: string; key: string; icon?: string }): ShellNavItem => ({
    href: entry.href,
    label: shell[entry.key],
    ...(entry.icon ? { icon: ICONS[app][entry.icon] } : {}),
  });
  const dict = appDict(app) as unknown;
  const index = indexFor(app);
  const loadIndex = async () => index;
  if (app === "wfo") {
    const w = dict as unknown as {
      workers: { list: { newWorker: string } };
      clients: { newClient: string };
      worksites: { newWorksite: string };
      companies: { newCompany: string };
      subcontractors: { newSubcontractor: string };
      accommodations: { newAccommodation: string };
      vehicles: { newVehicle: string };
    };
    return {
      app: "workforce",
      mark,
      nav: {
        workspaces: navModule.WORKSPACE_NAV.map(item),
        records: navModule.NAV.map(item),
        tools: navModule.TOOLS_NAV.map(item),
        footer: navModule.SECONDARY_NAV.map(item),
      },
      user: { name: "Ana Novak", email: "ana.novak@example.com" },
      onSignOut: async () => {},
      initialIsMac: false,
      contentWidth: "5xl",
      floatingLauncher: true,
      palette: {
        loadIndex,
        search: librarySearch(app),
        create: [
          { href: "/workers/new", label: w.workers.list.newWorker },
          { href: "/clients/new", label: w.clients.newClient },
          { href: "/worksites/new", label: w.worksites.newWorksite },
          { href: "/companies/new", label: w.companies.newCompany },
          { href: "/subcontractors/new", label: w.subcontractors.newSubcontractor },
          { href: "/accommodations/new", label: w.accommodations.newAccommodation },
          { href: "/vehicles/new", label: w.vehicles.newVehicle },
        ],
        trailing: {
          header: shell.assistant,
          label: (query) => fmt(shell.searchAskAssistant, { query }),
          icon: <ChatGlyph />,
          // Workforce Ops keeps its assistant event (OPEN_ASSISTANT_EVENT stays app code).
          onSelect: (query) => window.dispatchEvent(new CustomEvent("wf:open-assistant", { detail: { prompt: query } })),
        },
      },
    };
  }
  const f = dict as unknown as {
    statements: { newImport: string };
    rules: { newRule: string };
    setup: { accounts: { newAccount: string } };
  };
  return {
    app: "finaops",
    mark,
    nav: {
      workspaces: navModule.WORKSPACE_NAV.map(item),
      records: navModule.NAV.map(item),
      footer: navModule.SECONDARY_NAV.map(item),
    },
    user: { name: "Ana Novak", email: "ana.novak@example.com" },
    onSignOut: async () => {},
    initialIsMac: false,
    palette: {
      loadIndex,
      search: librarySearch(app),
      create: [
        { href: "/statements/new", label: f.statements.newImport },
        { href: "/rules?new=1", label: f.rules.newRule },
        { href: "/accounts/new", label: f.setup.accounts.newAccount },
      ],
      trailing: {
        header: shell.transactions,
        label: (query) => fmt(shell.searchTransactions, { query }),
        icon: <ListGlyph />,
        href: (query) => `/transactions?q=${encodeURIComponent(query)}`,
      },
    },
  };
}

/**
 * The INTENTIONAL differences between an app's shell markup and the library's, as exact
 * replacements on the app's markup, each with the number of times it must apply. Nothing else
 * may differ.
 */
/** `part: "frame"`: only in a render of the whole frame (the content column, `data-pull-content`). */
export type MarkupDifference = { app: AppKey; from: string; to: string; count: number; why: string; part?: "frame" };

export const INTENTIONAL_DIFFERENCES: readonly MarkupDifference[] = [
  {
    app: "wfo",
    from: '<div class="flex px-5 pt-5 pb-6">',
    to: '<div class="flex items-center px-5 pt-5 pb-6">',
    count: 1,
    why:
      "The sidebar's mark row centres its one child (FinaOps' row). The child alone sets the row's height, so stretch and centre lay it out the same: 0 changed pixels.",
  },
  {
    app: "wfo",
    from: " max-w-5xl ",
    to: " max-w-[64rem] ",
    count: 1,
    part: "frame",
    why:
      "1.6.0: the content column's width as its value (64rem = Tailwind's max-w-5xl), so the library declares no --container-5xl theme variable in an app that never renders it: 0 changed pixels.",
  },
  {
    app: "finaops",
    from: " max-w-6xl ",
    to: " max-w-[72rem] ",
    count: 1,
    part: "frame",
    why:
      "1.6.0: the content column's width as its value (72rem = Tailwind's max-w-6xl), so the library declares no --container-6xl theme variable in an app that never renders it: 0 changed pixels.",
  },
];

export function applyDifferences(app: AppKey, html: string): string {
  let out = html;
  for (const d of INTENTIONAL_DIFFERENCES.filter((x) => x.app === app)) {
    if (d.part === "frame" && !html.includes("data-pull-content")) continue;
    const count = out.split(d.from).length - 1;
    if (count !== d.count) throw new Error(`${app}: intentional difference found ${count} times, expected ${d.count}: ${d.from}`);
    out = out.split(d.from).join(d.to);
  }
  return out;
}
