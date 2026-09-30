"use client";

import { AttentionList } from "../components/attention-list";
import { Monogram } from "../components/monogram";
import { RowMenu } from "../components/row-menu";
import { StateMark } from "../components/state-mark";
import { RowLink, Table, TBody, TD, TH, THead, TR } from "../components/table";
import type { Story } from "./index";

const ROWS = [
  { id: "a", name: "Barišić, Josip", code: "LM", site: "Augsburg · MASC", mark: null, attention: [] },
  { id: "b", name: "Hodžić, Aldin", code: "VA", site: "—", mark: "Onboarding", attention: [{ tone: "danger" as const, text: "Missing: PIN", icon: "question" as const }] },
  { id: "c", name: "Mehmedović, Senad", code: "MET", site: "Rotterdam · MAXS", mark: null, attention: [{ tone: "warning" as const, text: "1 due within 30 days" }] },
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
];
