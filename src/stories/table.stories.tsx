"use client";

import { AttentionList } from "../components/attention-list";
import { Monogram } from "../components/monogram";
import { RowMenu } from "../components/row-menu";
import { StateMark } from "../components/state-mark";
import { useState } from "react";
import { RowLink, Table, TBody, TD, TFoot, TGroupRow, TH, THead, TR, TTotalRow } from "../components/table";
import type { Story } from "./index";

const ROWS = [
  { id: "a", name: "Barišić, Josip", code: "LM", site: "Augsburg · MASC", mark: null, attention: [] },
  { id: "b", name: "Hodžić, Aldin", code: "VA", site: "—", mark: "Onboarding", attention: [{ tone: "danger" as const, text: "Missing: PIN", icon: "question" as const }] },
  { id: "c", name: "Mehmedović, Senad", code: "MET", site: "Rotterdam · MAXS", mark: null, attention: [{ tone: "warning" as const, text: "1 due within 30 days" }] },
];

const INVOICES = [
  { number: "VA-2026-0041", customer: "Kraftwerk Bau GmbH", period: "05-2026", due: "30-06-2026", total: "19,657.20" },
  { number: "VA-2026-0042", customer: "MAXS Rotterdam B.V.", period: "06-2026", due: "31-07-2026", total: "8,240.00" },
  { number: "2026-0001", customer: "Vantus d.o.o.", period: "05-2026", due: "30-06-2026", total: "12,570.14" },
];

export const stories: Story[] = [
  {
    name: "Rows",
    render: () => (
      <Table className="min-w-[40rem]">
        <THead>
          <TR>
            <TH>Worker</TH>
            <TH>Employer</TH>
            <TH>Worksite</TH>
            <TH>Attention</TH>
            <TH className="w-px" />
          </TR>
        </THead>
        <TBody>
          {ROWS.map((row) => (
            <TR key={row.id} href={`#worker-${row.id}`}>
              <TD>
                <span className="flex flex-wrap items-center gap-2">
                  <RowLink href={`#worker-${row.id}`}>{row.name}</RowLink>
                  {row.mark && (
                    <StateMark tone="neutral" icon="draft">
                      {row.mark}
                    </StateMark>
                  )}
                </span>
              </TD>
              <TD>
                <Monogram code={row.code} tone={row.code === "MET" ? "external" : "own"} />
              </TD>
              <TD className="text-ink-secondary">{row.site}</TD>
              <TD>
                <AttentionList items={row.attention} />
              </TD>
              <TD className="w-px">
                <RowMenu label={`Actions: ${row.name}`} items={[{ key: "edit", label: "Edit", icon: "edit", onClick: () => {} }]} />
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    ),
  },
  {
    name: "Column props",
    render: () => (
      <Table>
        <THead>
          <TR>
            <TH>Invoice</TH>
            <TH hideBelow="sm">Customer</TH>
            <TH hideBelow="md">Period</TH>
            <TH hideBelow="lg">Due</TH>
            <TH alignRight>Total</TH>
          </TR>
        </THead>
        <TBody>
          {INVOICES.map((row) => (
            <TR key={row.number}>
              <TD>
                <RowLink href={`#invoice-${row.number}`}>{row.number}</RowLink>
              </TD>
              <TD hideBelow="sm" className="text-ink-secondary">
                {row.customer}
              </TD>
              <TD hideBelow="md">{row.period}</TD>
              <TD hideBelow="lg">{row.due}</TD>
              <TD numeric className="text-detail">
                {row.total}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    ),
  },
  { name: "Group rows and a total", render: () => <Grouped /> },
];

const LEDGER = [
  { group: "Material", lines: [{ name: "Pipes P265GH", amount: "4,812.00" }, { name: "Flanges PN40", amount: "1,240.50" }], total: "6,052.50" },
  { group: "Labour", lines: [{ name: "Welding, 118 h", amount: "5,192.00" }], total: "5,192.00" },
];

/** 1.8.0: group rows (a spanning heading and a folding group with its total) and the tfoot total. */
function Grouped() {
  const [open, setOpen] = useState<Record<string, boolean>>({ Material: true, Labour: false });
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Table aria-label="Material prices">
        <THead>
          <TR>
            <TH>Article</TH>
            <TH alignRight>Price</TH>
          </TR>
        </THead>
        <TBody>
          <TGroupRow colSpan={2} label="Pipes" meta="2 articles" />
          <TR>
            <TD>P265GH 168.3 x 7.1</TD>
            <TD numeric>4.82 €/kg</TD>
          </TR>
          <TR>
            <TD>P235GH 60.3 x 3.6</TD>
            <TD numeric>3.95 €/kg</TD>
          </TR>
          <TGroupRow colSpan={2} label="Flanges" meta="1 article" />
          <TR>
            <TD>Weld neck PN40 DN150</TD>
            <TD numeric>62.00 €/pc</TD>
          </TR>
        </TBody>
      </Table>
      <Table aria-label="Cost ledger">
        <THead>
          <TR>
            <TH>Cost</TH>
            <TH alignRight>Amount</TH>
          </TR>
        </THead>
        <TBody>
          {LEDGER.map((group) => (
            <GroupLines key={group.group} group={group} open={Boolean(open[group.group])} onToggle={() => setOpen((o) => ({ ...o, [group.group]: !o[group.group] }))} />
          ))}
        </TBody>
        <TFoot>
          <TTotalRow label="Total cost">
            <TD numeric>11,244.50</TD>
          </TTotalRow>
        </TFoot>
      </Table>
    </div>
  );
}

function GroupLines({ group, open, onToggle }: { group: (typeof LEDGER)[number]; open: boolean; onToggle: () => void }) {
  return (
    <>
      <TGroupRow label={group.group} count={group.lines.length} open={open} onToggle={onToggle}>
        <TD numeric className="py-1.5 font-semibold">{group.total}</TD>
      </TGroupRow>
      {open &&
        group.lines.map((line) => (
          <TR key={line.name}>
            <TD className="pl-10">{line.name}</TD>
            <TD numeric>{line.amount}</TD>
          </TR>
        ))}
    </>
  );
}
