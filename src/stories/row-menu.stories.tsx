"use client";

import { RowMenu, type RowMenuItem, type RowMenuSection } from "../components/row-menu";
import { Table, TBody, TD, TH, THead, TR } from "../components/table";
import type { Story } from "./index";

const ITEMS: RowMenuItem[] = [
  { key: "open", label: "Open worker", icon: "view", href: "#worker" },
  { key: "edit", label: "Edit", icon: "edit", onClick: () => {} },
  { key: "scan", label: "Replace scan", icon: "upload", onClick: () => {}, disabled: true },
  { key: "delete", label: "Delete", icon: "delete", onClick: () => {}, danger: true },
];

// 1.4.0: a labelled trigger and headed sections (PrefabOps restyle plan G8: the review's AI menu).
const SECTIONS: RowMenuSection[] = [
  {
    key: "page",
    heading: "Current page",
    items: [{ key: "extract", label: "Extract page", icon: "sparkle", onClick: () => {} }],
  },
  {
    key: "bulk",
    heading: "Bulk actions",
    items: [
      { key: "unreviewed", label: "Extract un-reviewed (3)", icon: "sparkle", onClick: () => {} },
      { key: "all", label: "Re-extract all", icon: "refresh", onClick: () => {}, disabled: true },
    ],
  },
];
const RESET: RowMenuItem[] = [{ key: "reset", label: "Reset to AI draft", icon: "restore", onClick: () => {} }];

function Rows({ names }: { names: string[] }) {
  return (
    <Table className="max-w-xl">
      <THead>
        <TR>
          <TH>Document</TH>
          <TH className="w-px" />
        </TR>
      </THead>
      <TBody>
        {names.map((name) => (
          <TR key={name}>
            <TD>{name}</TD>
            <TD className="w-px text-right">
              <RowMenu label={`Actions: ${name}`} items={ITEMS} />
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

export const stories: Story[] = [
  {
    name: "Open below",
    render: () => (
      <div className="min-h-80 max-w-xl">
        <Rows names={["Passport"]} />
      </div>
    ),
    open: '[data-story] button[aria-haspopup="menu"]',
  },
  {
    name: "Opens upward on the last row",
    render: () => (
      <div className="flex h-[calc(100dvh-3rem)] max-w-xl flex-col justify-end">
        <Rows names={["Passport", "A1 certificate"]} />
      </div>
    ),
    open: '[data-story] tr:last-child button[aria-haspopup="menu"]',
  },
  {
    name: "Label trigger and sections",
    render: () => (
      <div className="min-h-80">
        <div className="flex flex-wrap items-center gap-2">
          {/* The opened trigger is ghost: a hovered bordered button's rounded corners rasterize a
              byte differently from run to run (the button--matrix@hover-secondary flake); the
              secondary default is shown at rest beside it. */}
          <RowMenu label="AI extraction tools" trigger={{ label: "AI tools", icon: "sparkle", variant: "ghost" }} items={RESET} sections={SECTIONS} />
          <RowMenu label="More actions" trigger={{ label: "More" }} items={ITEMS} />
        </div>
      </div>
    ),
    open: '[data-story] button[title="AI extraction tools"]',
  },
  {
    name: "Sections open upward on the last row",
    render: () => (
      <div className="flex h-[calc(100dvh-3rem)] max-w-xl flex-col justify-end">
        <div className="flex justify-end border-t border-border pt-2">
          <RowMenu label="Review actions" sections={[{ key: "rows", items: ITEMS }, ...SECTIONS]} />
        </div>
      </div>
    ),
    open: '[data-story] button[aria-label="Review actions"]',
  },
  // 1.7.0: under [data-ops-touch] on a phone every item is at least 44px tall.
  {
    name: "Open below under the touch floor",
    render: () => (
      <div data-ops-touch="" className="min-h-96 max-w-xl">
        <Rows names={["Passport"]} />
      </div>
    ),
    open: '[data-story] button[aria-haspopup="menu"]',
  },
];
