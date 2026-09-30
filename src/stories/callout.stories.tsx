"use client";

import { Callout } from "../components/callout";
import type { CalloutTone } from "../types";
import type { Story } from "./index";
import { Stack } from "./story-layout";

const TONES: [CalloutTone, string][] = [
  ["danger", "The worksite address is missing: the posting order cannot be generated."],
  ["warning", "Return unconfirmed — expected back 21-09-2026."],
  ["info", "The first price applies from the worksite start, 01-08-2026."],
  ["success", "Saved."],
  ["neutral", "This quote is locked. Revise it to change the rates."],
  ["admin", "Admin tools: this correction is audited."],
];

export const stories: Story[] = [
  {
    name: "Tones",
    render: () => (
      <Stack className="max-w-xl gap-3">
        {TONES.map(([tone, text]) => (
          <Callout key={tone} tone={tone}>
            {text}
          </Callout>
        ))}
      </Stack>
    ),
  },
  {
    name: "Title, icon, floating",
    render: () => (
      <Stack className="max-w-xl gap-3">
        <Callout tone="warning" title="Not named on a valid notification:">
          Hodžić, Aldin · Šabanović, Emir
        </Callout>
        <Callout tone="neutral" icon="lock" title="Locked" bodyClassName="flex flex-col gap-1">
          <span>Signed on 12-08-2026 in Maribor.</span>
          <span>Terms and rates stay as signed; the signing facts can be corrected.</span>
        </Callout>
        <Callout
          tone="danger"
          floating
          role="alert"
          trailing={
            <button type="button" aria-label="Close" className="-my-1 shrink-0 rounded-control p-1.5 text-sm leading-none text-ink-muted">
              ✕
            </button>
          }
        >
          A floating alert with a trailing control: the toast shape. A long message wraps inside the box without pushing the close
          button away — Ludwigshafen · BASF · LM:project_hourly.
        </Callout>
      </Stack>
    ),
  },
];
