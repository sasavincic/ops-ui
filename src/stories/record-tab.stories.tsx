"use client";

import { RecordTab, RecordTabAction, RecordTabNote } from "../components/record-tab";
import { Table, TBody, TD, TH, THead, TR } from "../components/table";
import { ReadOnlyScope } from "../config/read-only";
import type { Story } from "./index";
import { Stack } from "./story-layout";

function Documents() {
  return (
    <Table>
      <THead>
        <TR>
          <TH>Document</TH>
          <TH>Validity</TH>
        </TR>
      </THead>
      <TBody>
        <TR>
          <TD>Passport</TD>
          <TD>31-12-2030</TD>
        </TR>
      </TBody>
    </Table>
  );
}

function Tabs() {
  return (
    <Stack className="max-w-3xl gap-10">
      <RecordTab intro="The worker's papers: passport, residence permit, A1." action={<RecordTabAction onClick={() => {}}>New document</RecordTabAction>}>
        <Documents />
      </RecordTab>
      <RecordTab intro="Pay agreements of this worker." action={<RecordTabNote>His firm pays him: no agreement of ours.</RecordTabNote>}>
        <Documents />
      </RecordTab>
    </Stack>
  );
}

export const stories: Story[] = [
  { name: "Intro, action, note", render: () => <Tabs /> },
  {
    name: "In a read-only scope",
    render: () => (
      <ReadOnlyScope readOnly>
        <Tabs />
      </ReadOnlyScope>
    ),
  },
];
