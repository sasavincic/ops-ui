"use client";

import { useState } from "react";
import { ActionIcon } from "../components/action-icon";
import { Checkbox, CheckTile, Field, FileInput, Input, Select, Switch, Textarea } from "../components/field";
import { ReadOnlyScope } from "../config/read-only";
import type { Story } from "./index";
import { Row, Stack } from "./story-layout";

function States() {
  return (
    <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
      <Field label="Name" htmlFor="f-plain">
        <Input id="f-plain" defaultValue="Hodžić, Aldin" />
      </Field>
      <Field label="PIN" htmlFor="f-hint" hint="13 digits (EMŠO)">
        <Input id="f-hint" placeholder="0101990500001" />
      </Field>
      <Field label="Tax number" htmlFor="f-error" error="Invalid tax number." hint="SI + 8 digits">
        <Input id="f-error" defaultValue="SI1234567" aria-invalid />
      </Field>
      <Field label="Valid to" htmlFor="f-warning" warning="Read as 31-12-2027 (handwritten)">
        <Input id="f-warning" defaultValue="31-12-2027" />
      </Field>
    </div>
  );
}

function Controls() {
  return (
    <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
      <Field label="Input" htmlFor="c-input">
        <Input id="c-input" placeholder="Placeholder" />
      </Field>
      <Field label="Disabled input" htmlFor="c-disabled">
        <Input id="c-disabled" defaultValue="Latro Mont d.o.o." disabled />
      </Field>
      <Field label="Select" htmlFor="c-select">
        <Select id="c-select" defaultValue="lm">
          <option value="lm">Latro Mont</option>
          <option value="va">Vantus</option>
        </Select>
      </Field>
      <Field label="File" htmlFor="c-file">
        <FileInput id="c-file" />
      </Field>
      <Field label="Textarea" htmlFor="c-textarea" className="sm:col-span-2">
        <Textarea id="c-textarea" defaultValue="Internal note, never printed." />
      </Field>
      <div className="flex flex-col gap-2">
        <Checkbox label="Mobile worksite" defaultChecked />
        <Checkbox label="No bed needed" />
        <Checkbox label="Disabled" disabled defaultChecked />
      </div>
    </div>
  );
}

function Tiles() {
  const [picked, setPicked] = useState<Record<string, boolean>>({ tig: true, mag: false, bed: true });
  const toggle = (key: string) => setPicked((p) => ({ ...p, [key]: !p[key] }));
  return (
    <div className="grid max-w-2xl gap-2 sm:grid-cols-2">
      <CheckTile label="Welder TIG (141)" checked={picked.tig} onChange={() => toggle("tig")} />
      <CheckTile label="Welder MAG (135/136/138)" checked={picked.mag} onChange={() => toggle("mag")} />
      <CheckTile
        label="Accommodation"
        hint="Beds booked by us"
        icon={<ActionIcon name="bed" />}
        checked={picked.bed}
        onChange={() => toggle("bed")}
      />
      <CheckTile label="Labour" hint="Always included" checked disabled onChange={() => {}} />
    </div>
  );
}

function Switches() {
  const [on, setOn] = useState({ a: false, b: true });
  return (
    <div className="flex max-w-md flex-col gap-4">
      <Switch label="Never expires" checked={on.a} onChange={(v) => setOn((s) => ({ ...s, a: v }))} />
      <Switch id="story-switch" name="mobile" label="Mobile worksite" hint="The client moves the crew" checked={on.b} onChange={(v) => setOn((s) => ({ ...s, b: v }))} />
      <Switch label="Disabled" checked disabled onChange={() => {}} />
    </div>
  );
}

export const stories: Story[] = [
  { name: "States", render: () => <States /> },
  { name: "Controls", render: () => <Controls /> },
  { name: "Check tiles", render: () => <Tiles /> },
  { name: "Switch", render: () => <Switches /> },
  {
    name: "In a read-only scope",
    render: () => (
      <ReadOnlyScope readOnly>
        <Stack>
          <Controls />
          <Tiles />
          <Switches />
          <Row label="readOnlySafe stays usable">
            <Input readOnlySafe placeholder="A filter" className="max-w-xs" />
          </Row>
        </Stack>
      </ReadOnlyScope>
    ),
  },
];
