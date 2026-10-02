"use client";

import { useState } from "react";
import { Field } from "../components/field";
import { YearInput } from "../components/year-input";
import { ReadOnlyScope } from "../config/read-only";
import type { Story } from "./index";

function Controlled({ id, initial, min, max, required, size }: { id: string; initial: string; min?: number; max?: number; required?: boolean; size?: "md" | "lg" }) {
  const [value, setValue] = useState(initial);
  return <YearInput id={id} value={value} onChange={(e) => setValue(e.target.value)} min={min} max={max} required={required} size={size} />;
}

function Picker({ initial, min, max }: { initial: string; min?: number; max?: number }) {
  return (
    <div className="max-w-xs min-h-[22rem]">
      <Field label="Year of manufacture" htmlFor="story-year" hint={min || max ? `Between ${min} and ${max}` : undefined}>
        <Controlled id="story-year" initial={initial} min={min} max={max} />
      </Field>
    </div>
  );
}

const OPEN = "[data-story] input[role=combobox]";

export const stories: Story[] = [
  {
    name: "States",
    render: () => (
      <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <Field label="Empty" htmlFor="y-empty">
          <Controlled id="y-empty" initial="" />
        </Field>
        <Field label="With a year" htmlFor="y-value">
          <Controlled id="y-value" initial="2026" />
        </Field>
        <Field label="Disabled" htmlFor="y-disabled">
          <YearInput id="y-disabled" defaultValue="2019" disabled />
        </Field>
        <Field label="After its maximum" htmlFor="y-range" hint="Not after 2027">
          <Controlled id="y-range" initial="2031" max={2027} />
        </Field>
        <Field label="Uncontrolled, posting its year" htmlFor="y-uncontrolled">
          <YearInput id="y-uncontrolled" name="manufactureYear" defaultValue="2024" />
        </Field>
        <ReadOnlyScope readOnly>
          <Field label="In a read-only scope" htmlFor="y-readonly">
            <YearInput id="y-readonly" defaultValue="2025" />
          </Field>
        </ReadOnlyScope>
        <Field label="Large" htmlFor="y-large" className="sm:col-span-2">
          <Controlled id="y-large" initial="2026" size="lg" />
        </Field>
      </div>
    ),
  },
  { name: "Picker", render: () => <Picker initial="2024" />, open: OPEN },
  { name: "Picker with limits", render: () => <Picker initial="" min={2019} max={2027} />, open: OPEN },
  // 1.7.0: under [data-ops-touch] on a phone the field's button, the arrows and This year / Clear
  // are at least 44px (the year cells already were).
  {
    name: "Picker under the touch floor",
    render: () => (
      <div data-ops-touch="">
        <Picker initial="2024" />
      </div>
    ),
    open: OPEN,
  },
  // 1.8.0: at size="lg" the floor is 48px.
  { name: "Large under the touch floor", render: () => <LargeUnderTheFloor /> },
];

/** 1.8.0: an lg field under [data-ops-touch] on a phone: the picker button reaches 48 x 48. */
function LargeUnderTheFloor() {
  return (
    <div data-ops-touch="" className="max-w-xs">
      <Field label="Year of manufacture" htmlFor="story-lg-year">
        <Controlled id="story-lg-year" initial="2026" size="lg" />
      </Field>
    </div>
  );
}
