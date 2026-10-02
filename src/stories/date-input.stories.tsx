"use client";

import { useState } from "react";
import { DateInput } from "../components/date-input";
import { Field } from "../components/field";
import { ReadOnlyScope } from "../config/read-only";
import type { Story } from "./index";

function Controlled({ id, initial, min, max, required }: { id: string; initial: string; min?: string; max?: string; required?: boolean }) {
  const [value, setValue] = useState(initial);
  return <DateInput id={id} value={value} onChange={(e) => setValue(e.target.value)} min={min} max={max} required={required} />;
}

function Calendar({ initial, min, max }: { initial: string; min?: string; max?: string }) {
  return (
    <div className="max-w-xs min-h-[26rem]">
      <Field label="First working day" htmlFor="story-calendar" hint={min || max ? "Between 10-09-2026 and 05-10-2026" : undefined}>
        <Controlled id="story-calendar" initial={initial} min={min} max={max} />
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
        <Field label="Empty" htmlFor="d-empty">
          <Controlled id="d-empty" initial="" />
        </Field>
        <Field label="With a date" htmlFor="d-value">
          <Controlled id="d-value" initial="2026-09-18" />
        </Field>
        <Field label="Disabled" htmlFor="d-disabled">
          <DateInput id="d-disabled" defaultValue="2026-08-01" disabled />
        </Field>
        <Field label="Before its minimum" htmlFor="d-range" hint="Not before 01-10-2026">
          <Controlled id="d-range" initial="2026-09-18" min="2026-10-01" />
        </Field>
        <Field label="Uncontrolled, posting its ISO value" htmlFor="d-uncontrolled">
          <DateInput id="d-uncontrolled" name="startDate" defaultValue="1989-11-23" />
        </Field>
        <ReadOnlyScope readOnly>
          <Field label="In a read-only scope" htmlFor="d-readonly">
            <DateInput id="d-readonly" defaultValue="2026-09-01" />
          </Field>
        </ReadOnlyScope>
      </div>
    ),
  },
  { name: "Calendar", render: () => <Calendar initial="2026-09-18" />, open: OPEN },
  { name: "Calendar with limits", render: () => <Calendar initial="" min="2026-09-10" max="2026-10-05" />, open: OPEN },
  // 1.7.0: under [data-ops-touch] on a phone the calendar button, the arrows, the title, the days
  // and Today / Clear are at least 44px; at 1440 and 375 this is the Calendar story.
  {
    name: "Calendar under the touch floor",
    render: () => (
      <div data-ops-touch="">
        <Calendar initial="2026-09-18" />
      </div>
    ),
    open: OPEN,
  },
  // 1.8.0: at size="lg" the floor is 48px (at 1440 and 375 the lg field as it was).
  { name: "Large under the touch floor", render: () => <LargeUnderTheFloor /> },
];

/** 1.8.0: an lg field under [data-ops-touch] on a phone: the calendar button reaches 48 x 48. */
function LargeUnderTheFloor() {
  const [value, setValue] = useState("2026-10-02");
  return (
    <div data-ops-touch="" className="max-w-xs">
      <Field label="Shipping date" htmlFor="story-lg-date">
        <DateInput id="story-lg-date" size="lg" value={value} onChange={(e) => setValue(e.target.value)} />
      </Field>
    </div>
  );
}
