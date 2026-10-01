"use client";

import { useState } from "react";
import { ActionIcon } from "../components/action-icon";
import { Button } from "../components/button";
import { Combobox } from "../components/combobox";
import { DateInput } from "../components/date-input";
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

/** The input family at size="lg" (1.3.0): 48px, 16px text at every width, beside a large Button. */
function Large() {
  const [worker, setWorker] = useState("w2");
  const [year, setYear] = useState("2026-09-30");
  return (
    <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
      <Field label="Weight (kg)" htmlFor="lg-input">
        <Input id="lg-input" size="lg" inputMode="decimal" defaultValue="1 240" />
      </Field>
      <Field label="Material certificate" htmlFor="lg-select">
        <Select id="lg-select" size="lg" defaultValue="31">
          <option value="31">3.1</option>
          <option value="22">2.2</option>
        </Select>
      </Field>
      <Field label="Welder" htmlFor="lg-combobox">
        <Combobox
          id="lg-combobox"
          size="lg"
          value={worker}
          onChange={setWorker}
          options={[
            { value: "w1", label: "Barišić, Josip" },
            { value: "w2", label: "Nguyen, Dinh Hai" },
          ]}
        />
      </Field>
      <Field label="Shipping date" htmlFor="lg-date">
        <DateInput id="lg-date" size="lg" value={year} onChange={(e) => setYear(e.target.value)} />
      </Field>
      <div className="flex gap-2 sm:col-span-2">
        <Button size="lg" variant="secondary">
          Cancel
        </Button>
        <Button size="lg" icon="save">
          Save
        </Button>
      </div>
      <Field label="Medium, for comparison" htmlFor="md-input" className="sm:col-span-2">
        <Input id="md-input" defaultValue="1 240" />
      </Field>
    </div>
  );
}

/** 1.4.0: Input prefix / suffix (units and currency). */
function Adornments() {
  return (
    <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
      <Field label="Wall thickness" htmlFor="a-mm" hint="Nominal, before corrosion allowance">
        <Input id="a-mm" inputMode="decimal" defaultValue="4.5" suffix="mm" />
      </Field>
      <Field label="Design pressure" htmlFor="a-bar">
        <Input id="a-bar" inputMode="decimal" defaultValue="16" suffix="bar" className="text-right" />
      </Field>
      <Field label="Design temperature" htmlFor="a-c">
        <Input id="a-c" inputMode="decimal" placeholder="120" suffix="°C" />
      </Field>
      <Field label="Hourly rate" htmlFor="a-eur">
        <Input id="a-eur" inputMode="decimal" defaultValue="46.80" prefix="€" suffix="/h" />
      </Field>
      <Field label="Weight" htmlFor="a-kg" error="Enter a weight above 0.">
        <Input id="a-kg" inputMode="decimal" defaultValue="0" suffix="kg" aria-invalid />
      </Field>
      <Field label="Surcharge" htmlFor="a-pct">
        <Input id="a-pct" inputMode="decimal" defaultValue="25" suffix="%" disabled />
      </Field>
      <Field label="Transport cost, large" htmlFor="a-lg">
        <Input id="a-lg" size="lg" inputMode="decimal" defaultValue="380.00" prefix="€" />
      </Field>
      <Field label="Narrow, in a grid cell" htmlFor="a-narrow">
        <Input id="a-narrow" inputMode="decimal" defaultValue="219.1" suffix="mm" wrapperClassName="w-32" className="h-8 text-right" />
      </Field>
    </div>
  );
}

export const stories: Story[] = [
  { name: "States", render: () => <States /> },
  { name: "Controls", render: () => <Controls /> },
  { name: "Check tiles", render: () => <Tiles /> },
  { name: "Switch", render: () => <Switches /> },
  { name: "Large", render: () => <Large /> },
  { name: "Adornments", render: () => <Adornments /> },
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
