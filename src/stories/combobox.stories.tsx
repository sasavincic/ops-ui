"use client";

import { useState } from "react";
import { Combobox, type ComboboxOption } from "../components/combobox";
import { Field } from "../components/field";
import type { Story } from "./index";

const WORKERS: ComboboxOption[] = [
  {
    value: "w1",
    label: "Barišić, Josip",
    meta: "€24.50/h",
    mark: { code: "LM", title: "Latro Mont" },
    lines: [{ text: "Welder TIG (141)" }],
    group: "Our companies",
  },
  {
    value: "w2",
    label: "Nguyen, Dinh Hai",
    meta: "€22.00/h",
    mark: { code: "VA", title: "Vantus" },
    lines: [{ text: "Pipe Fitter" }, { text: "currently at Rotterdam · MAXS", tone: "warning" }],
    group: "Our companies",
  },
  {
    value: "w3",
    label: "Hodžić, Aldin",
    mark: { code: "LM", title: "Latro Mont" },
    lines: [{ text: "Foreman" }],
    group: "Our companies",
    disabled: true,
  },
  {
    value: "w4",
    label: "Mehmedović, Senad",
    meta: "€19.00/h",
    mark: { code: "MET", tone: "external", title: "Metalmont s.p." },
    lines: [{ text: "Helper" }],
    group: "Subcontractors",
  },
  { value: "w5", label: "Šabanović, Emir", mark: { code: "MET", tone: "external" }, group: "Subcontractors", keywords: "Bosnia BA" },
];

function Demo({ initial, options, tall, clearLabel }: { initial: string; options: ComboboxOption[]; tall?: boolean; clearLabel?: string }) {
  const [value, setValue] = useState(initial);
  const [submits, setSubmits] = useState(0);
  // Inside a form on purpose: Enter picks the highlighted row, it never submits (the
  // behaviour test reads data-submits).
  return (
    <form
      className="max-w-sm min-h-96"
      data-submits={submits}
      data-value={value}
      onSubmit={(e) => {
        e.preventDefault();
        setSubmits((n) => n + 1);
      }}
    >
      <Field label="Worker" htmlFor="story-combobox">
        <Combobox id="story-combobox" value={value} options={options} onChange={setValue} tall={tall} clearLabel={clearLabel} />
      </Field>
    </form>
  );
}

const OPEN = "[data-story] input[role=combobox]";

export const stories: Story[] = [
  { name: "Closed with a value", render: () => <Demo initial="w2" options={WORKERS} /> },
  { name: "Open list", render: () => <Demo initial="" options={WORKERS} clearLabel="Not a worker" />, open: OPEN },
  { name: "Tall list", render: () => <Demo initial="w1" options={WORKERS} tall />, open: OPEN },
  { name: "No matches", render: () => <Demo initial="" options={[]} />, open: OPEN },
];
