"use client";

import { useState } from "react";
import { Button } from "../components/button";
import { ConfirmDialog, InlineConfirm } from "../components/confirm-dialog";
import { DateInput } from "../components/date-input";
import { Field } from "../components/field";
import type { Story } from "./index";
import { Row, Stack } from "./story-layout";

function DangerDemo() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button variant="ghostDanger" icon="delete" onClick={() => setOpen(true)}>
        Delete document
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
        title="Delete document"
        body="Delete the A1 certificate of Hodžić, Aldin? The scan goes with it."
        confirmLabel="Delete"
      />
    </>
  );
}

function SecondaryDemo() {
  const [open, setOpen] = useState(true);
  const [day, setDay] = useState("2026-09-30");
  return (
    <>
      <Button variant="secondary" icon="exit" onClick={() => setOpen(true)}>
        End deployment
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
        title="End deployment"
        body="Barišić, Josip leaves Augsburg · MASC."
        confirmLabel="End deployment"
        variant="secondary"
      >
        <Field label="Last working day" htmlFor="story-last-day">
          <DateInput id="story-last-day" value={day} onChange={(e) => setDay(e.target.value)} />
        </Field>
      </ConfirmDialog>
    </>
  );
}

function Inline({ armed: initial, pending }: { armed: boolean; pending?: boolean }) {
  const [armed, setArmed] = useState(initial);
  return (
    <InlineConfirm
      label="Delete row"
      question="Delete this row?"
      confirmLabel="Delete"
      armed={armed}
      onArm={setArmed}
      pending={pending}
      onConfirm={() => setArmed(false)}
    />
  );
}

export const stories: Story[] = [
  { name: "Danger", render: () => <DangerDemo /> },
  { name: "Secondary with a field", render: () => <SecondaryDemo /> },
  {
    name: "Inline",
    render: () => (
      <Stack>
        <Row label="Idle">
          <Inline armed={false} />
        </Row>
        <Row label="Armed">
          <Inline armed />
        </Row>
        <Row label="Pending">
          <Inline armed pending />
        </Row>
      </Stack>
    ),
  },
  { name: "Large", render: () => <LargeDemo /> },
];

/** 1.8.0: on an lg surface the ✕ and both buttons are 48px. */
function LargeDemo() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button size="lg" variant="ghostDanger" icon="delete" onClick={() => setOpen(true)}>
        Remove file
      </Button>
      <ConfirmDialog
        size="lg"
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
        title="Remove file"
        body="Remove the weld book scan from project 26-118?"
        confirmLabel="Remove"
      />
    </>
  );
}
