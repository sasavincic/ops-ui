"use client";

import { ChatGlyph, type PaletteSection } from "../shell/command-palette";
import { AppFrame } from "../shell/app-frame";
import type { ShellNav } from "../shell/nav";
import type { OpsAppId } from "../lib/apps";
import { normalizeSearchText } from "../lib/text";
import { Heading } from "../components/heading";
import { Text } from "../components/text";
import type { Story } from "./index";

// The shell (1.5.0): AppFrame with an app's nav, closed, with the phone drawer open and with
// the palette open, and a PrefabOps-shaped frame with all three registers. The marks are
// placeholders (an app passes its own BrandMark); the words are the library's English
// defaults plus the labels an app would pass. At 1440 the drawer story shows the desktop frame:
// the drawer exists below lg only.

/** A placeholder mark: the group's ochre dot and a wordmark, as the apps draw theirs. */
function PlaceholderMark({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent" />
      <span className="text-sm font-semibold tracking-tight text-sidebar-fg-active">{name}</span>
    </span>
  );
}

const OPERATIONS_NAV: ShellNav = {
  workspaces: [
    { href: "/operations", label: "Operations", icon: "board" },
    { href: "/compliance", label: "Compliance", icon: "shield-check" },
    { href: "/invoicing", label: "Invoicing", icon: "receipt" },
    { href: "/logistics", label: "Logistics", icon: "truck" },
  ],
  records: [
    { href: "/clients", label: "Clients" },
    { href: "/workers", label: "Workers" },
    { href: "/worksites", label: "Worksites" },
    { href: "/vehicles", label: "Vehicles" },
  ],
  footer: [{ href: "/settings", label: "Settings" }],
};

/** PrefabOps' navigation (styling programme §6.1): three workspaces, five records, one tool. */
const PREFAB_NAV: ShellNav = {
  workspaces: [
    { href: "/production", label: "Production", icon: "board" },
    { href: "/documentation", label: "Documentation", icon: "document" },
    { href: "/commercial", label: "Commercial", icon: "bars" },
  ],
  records: [
    { href: "/projects", label: "Projects" },
    { href: "/clients", label: "Clients" },
    { href: "/employees", label: "Employees" },
    { href: "/welding", label: "Welding procedures" },
    { href: "/material-prices", label: "Material prices" },
  ],
  tools: [{ href: "/offer-builder", label: "Offer builder", icon: "receipt" }],
  footer: [
    { href: "/workshop", label: "Workshop portal" },
    { href: "/settings", label: "Settings" },
  ],
};

type Entry = { key: string; kind: string; title: string; subtitle?: string; href: string; archived?: boolean };

const INDEX: Entry[] = [
  { key: "w1", kind: "Workers", title: "Ana Novak", subtitle: "Welder TIG · Augsburg", href: "/workers/1" },
  { key: "w2", kind: "Workers", title: "Anton Kos", href: "/workers/2", archived: true },
  { key: "s1", kind: "Worksites", title: "Annex hall · KBAN", subtitle: "Halle, Germany", href: "/worksites/3" },
];

function search(query: string, index: readonly Entry[]): PaletteSection[] {
  const q = normalizeSearchText(query);
  const sections: PaletteSection[] = [];
  for (const kind of ["Workers", "Worksites"]) {
    const entries = index
      .filter((e) => e.kind === kind && normalizeSearchText(e.title).includes(q))
      .map((e) => ({
        key: e.key,
        href: e.href,
        title: e.title,
        subtitle: e.subtitle,
        status: e.archived ? { label: "Archived", icon: "archive" as const, tone: "neutral" as const } : null,
      }));
    if (entries.length > 0) sections.push({ header: kind, entries });
  }
  return sections;
}

const loadIndex = async () => INDEX;

function Page({ title }: { title: string }) {
  return (
    <>
      <Heading level="title">{title}</Heading>
      <Text as="p" tone="secondary">
        The page renders here, in the content column.
      </Text>
    </>
  );
}

function Frame({
  app = "workforce",
  name = "Operations app",
  nav = OPERATIONS_NAV,
  active = "/operations",
  drawer = false,
  palette,
}: {
  app?: OpsAppId;
  name?: string;
  nav?: ShellNav;
  active?: string;
  drawer?: boolean;
  palette?: "idle" | "results";
}) {
  return (
    <AppFrame
      app={app}
      mark={<PlaceholderMark name={name} />}
      nav={nav}
      isActive={(href) => href === active}
      user={{ name: "Ana Novak", email: "ana.novak@example.com" }}
      onSignOut={() => {}}
      defaultDrawerOpen={drawer}
      navTrail={false}
      palette={{
        loadIndex,
        search,
        create: [
          { href: "/workers/new", label: "New worker" },
          { href: "/clients/new", label: "New client" },
        ],
        trailing: {
          header: "Assistant",
          label: (query) => `Ask the assistant: “${query}”`,
          icon: <ChatGlyph />,
          onSelect: () => {},
        },
        defaultOpen: palette !== undefined,
        defaultQuery: palette === "results" ? "an" : "",
      }}
    >
      <Page title={[...nav.workspaces, ...nav.records, ...(nav.tools ?? [])].find((item) => item.href === active)?.label ?? ""} />
    </AppFrame>
  );
}

const PALETTE_FIELD = '[data-story] [role="dialog"] input';

export const stories: Story[] = [
  { name: "Closed", render: () => <Frame /> },
  { name: "Drawer open", render: () => <Frame drawer active="/workers" /> },
  // The palette opens on mount; the `open` click lands in its own search field (where the focus
  // already is), so the shot repaints the page once like every opened overlay.
  { name: "Palette open", render: () => <Frame palette="idle" />, open: PALETTE_FIELD },
  { name: "Palette with results", render: () => <Frame palette="results" />, open: PALETTE_FIELD },
  {
    name: "PrefabOps registers",
    render: () => <Frame app="prefab" name="PrefabOps" nav={PREFAB_NAV} active="/production" />,
  },
  {
    name: "PrefabOps drawer",
    render: () => <Frame app="prefab" name="PrefabOps" nav={PREFAB_NAV} active="/offer-builder" drawer />,
  },
];
