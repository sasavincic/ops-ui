"use client";

import { RowMenu, type RowMenuItem } from "../components/row-menu";
import { Table, TBody, TD, TH, THead, TR } from "../components/table";
import type { Story } from "./index";

const ITEMS: RowMenuItem[] = [
  { key: "open", label: "Open worker", icon: "view", href: "#worker" },
  { key: "edit", label: "Edit", icon: "edit", onClick: () => {} },
  { key: "scan", label: "Replace scan", icon: "upload", onClick: () => {}, disabled: true },
  { key: "delete", label: "Delete", icon: "delete", onClick: () => {}, danger: true },
];

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
];
