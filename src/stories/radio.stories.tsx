"use client";

import { useState } from "react";
import { Monogram } from "../components/monogram";
import { ChoiceTile, Radio, RadioGroup } from "../components/radio";
import type { Story } from "./index";
import { Row, Stack } from "./story-layout";

function CreditChoice() {
  const [mode, setMode] = useState("full");
  return (
    <RadioGroup name="credit" value={mode} onChange={setMode} orientation="vertical" gap={2} aria-label="Credit note">
      <Radio value="full" label="Credit the whole invoice (€1,996.23)" />
      <Radio value="partial" label="Credit part of it" />
      <Radio value="none" label="Not now" disabled />
    </RadioGroup>
  );
}

function CustomerChoice() {
  const [choice, setChoice] = useState("create");
  return (
    <RadioGroup name="customer" value={choice} onChange={setChoice} orientation="horizontal" gap={4} aria-label="Customer">
      <Radio value="create" label="From Workforce Ops" />
      <Radio value="existing" label="An existing customer" />
    </RadioGroup>
  );
}

function Issuers() {
  const [issuer, setIssuer] = useState("va");
  return (
    <RadioGroup name="issuer" value={issuer} onChange={setIssuer} orientation="horizontal" gap={2} aria-label="Issuing company">
      <ChoiceTile layout="compact" value="lm" title="Latro Mont d.o.o.">
        <Monogram code="LM" />
        <span className="sr-only sm:not-sr-only">Latro Mont d.o.o.</span>
      </ChoiceTile>
      <ChoiceTile layout="compact" value="va" title="Vantus d.o.o.">
        <Monogram code="VA" />
        <span className="sr-only sm:not-sr-only">Vantus d.o.o.</span>
      </ChoiceTile>
    </RadioGroup>
  );
}

function Employers() {
  const [employer, setEmployer] = useState("lm");
  return (
    <RadioGroup as="fieldset" name="employer" value={employer} onChange={setEmployer} orientation="horizontal" gap={2} className="min-w-0">
      <ChoiceTile value="lm">
        <Monogram code="LM" />
        <span className="break-words">Latro Mont d.o.o.</span>
      </ChoiceTile>
      <ChoiceTile value="va">
        <Monogram code="VA" />
        <span className="break-words">Vantus d.o.o.</span>
      </ChoiceTile>
      <ChoiceTile value="x" disabled>
        <span className="break-words">Not offered</span>
      </ChoiceTile>
    </RadioGroup>
  );
}

function QuoteTypes() {
  const [type, setType] = useState("agency");
  const types = [
    ["agency", "Agency", "Agency work"],
    ["hourly", "Hourly", "Hourly service"],
    ["fixed", "Fixed price", "Fixed price"],
  ] as const;
  return (
    <RadioGroup name="type" value={type} onChange={setType} orientation="horizontal" className="grid auto-cols-fr grid-flow-col gap-2" aria-label="Quote type">
      {types.map(([value, short, long]) => (
        <ChoiceTile key={value} layout="stacked" value={value} title={long} aria-label={`${short} — ${long}`}>
          <span aria-hidden className="whitespace-nowrap font-medium sm:hidden">
            {short}
          </span>
          <span className="hidden break-words font-medium sm:block">{long}</span>
        </ChoiceTile>
      ))}
    </RadioGroup>
  );
}

export const stories: Story[] = [
  {
    name: "Group",
    render: () => (
      <Stack>
        <Row label="vertical, one disabled">
          <CreditChoice />
        </Row>
        <Row label="horizontal">
          <CustomerChoice />
        </Row>
      </Stack>
    ),
  },
  {
    name: "Choice tiles",
    render: () => (
      <Stack>
        <Row label="row (default), one disabled">
          <Employers />
        </Row>
        <Row label="compact">
          <Issuers />
        </Row>
        <Row label="stacked" className="block">
          <QuoteTypes />
        </Row>
      </Stack>
    ),
  },
];
