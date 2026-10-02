"use client";

import { useState } from "react";
import { Button } from "../components/button";
import { InlineConfirm } from "../components/confirm-dialog";
import { Dialog, DialogBody, DialogFooter } from "../components/dialog";
import { Field, Input, Select, Textarea } from "../components/field";
import type { Story } from "./index";
import { Row, Stack } from "./story-layout";

function FormDialog() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button variant="secondary" icon="edit" onClick={() => setOpen(true)}>
        Edit employment
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Edit employment">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setOpen(false);
          }}
        >
          <DialogBody>
            <Field label="Contract profession" htmlFor="story-profession" hint="What the contract calls the job.">
              <Input id="story-profession" defaultValue="Welder" />
            </Field>
            <Field label="Contract type" htmlFor="story-type">
              <Select id="story-type" defaultValue="fixed">
                <option value="fixed">Fixed term</option>
                <option value="indefinite">Indefinite</option>
              </Select>
            </Field>
            <Field label="Notes" htmlFor="story-notes">
              <Textarea id="story-notes" defaultValue="Signed in Maribor." />
            </Field>
            <DialogFooter onClose={() => setOpen(false)} submitLabel="Save changes" />
          </DialogBody>
        </form>
      </Dialog>
    </>
  );
}

function PinnedFooterDialog() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button icon="add" onClick={() => setOpen(true)}>
        New request
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="New request"
        footer={<DialogFooter onClose={() => setOpen(false)} onSubmit={() => setOpen(false)} submitLabel="Add request" submitIcon="add" variant="primary" />}
      >
        <DialogBody>
          {Array.from({ length: 14 }, (_, i) => (
            <p key={i} className="text-sm text-ink-secondary">
              Line {i + 1} of a long body: the body scrolls while the header and the pinned footer stay.
            </p>
          ))}
        </DialogBody>
      </Dialog>
    </>
  );
}

function Footers() {
  const [armed, setArmed] = useState(false);
  const noop = () => {};
  return (
    <Stack className="max-w-md">
      <Row label="secondary (default)" className="block">
        <DialogFooter onClose={noop} onSubmit={noop} submitLabel="Save changes" />
      </Row>
      <Row label="primary" className="block">
        <DialogFooter onClose={noop} onSubmit={noop} submitLabel="Deploy" submitIcon="enter" variant="primary" />
      </Row>
      <Row label="danger, pending" className="block">
        <DialogFooter onClose={noop} onSubmit={noop} submitLabel="Delete" submitIcon="delete" variant="danger" pending pendingLabel="Deleting…" />
      </Row>
      <Row label="admin, disabled, with a note" className="block">
        <DialogFooter onClose={noop} onSubmit={noop} submitLabel="Reopen" submitIcon="unlock" variant="admin" disabled note="Nothing to reopen." />
      </Row>
      <Row label="relabelled escape, delete on the left" className="block">
        <DialogFooter onClose={noop} onSubmit={noop} submitLabel="Confirm" closeLabel="Back to form">
          <InlineConfirm label="Delete" question="Delete?" confirmLabel="Delete" armed={armed} onArm={setArmed} onConfirm={noop} />
        </DialogFooter>
      </Row>
    </Stack>
  );
}

/** 1.7.0: under [data-ops-touch] on a phone the ✕ is 44 x 44 (and the header row grows with it). */
function TouchFloorDialog() {
  const [open, setOpen] = useState(true);
  return (
    <div data-ops-touch="">
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Rename
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Rename worksite">
        <DialogBody>
          <Field label="Name" htmlFor="story-touch-name">
            <Input id="story-touch-name" defaultValue="Augsburg" />
          </Field>
          <DialogFooter onClose={() => setOpen(false)} onSubmit={() => setOpen(false)} submitLabel="Save" />
        </DialogBody>
      </Dialog>
    </div>
  );
}

export const stories: Story[] = [
  { name: "Form", render: () => <FormDialog /> },
  { name: "Pinned footer and a long body", render: () => <PinnedFooterDialog /> },
  { name: "Footers", render: () => <Footers /> },
  { name: "Under the touch floor", render: () => <TouchFloorDialog /> },
  { name: "Large", render: () => <LargeDialog /> },
  { name: "Footer with a long note", render: () => <FooterWithLongNote /> },
];

/** 1.8.0: an lg surface's dialog: the ✕ and both footer buttons are 48px at every width. */
function LargeDialog() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button size="lg" variant="secondary" onClick={() => setOpen(true)}>
        Record weight
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Record weight" size="lg">
        <DialogBody>
          <Field label="Weight" htmlFor="story-lg-weight">
            <Input id="story-lg-weight" size="lg" defaultValue="1 240" suffix="kg" />
          </Field>
          <DialogFooter size="lg" onClose={() => setOpen(false)} onSubmit={() => setOpen(false)} submitLabel="Save" />
        </DialogBody>
      </Dialog>
    </>
  );
}

/** 1.8.0: a long note wraps beside the buttons instead of pushing them onto a second row. */
function FooterWithLongNote() {
  const noop = () => {};
  return (
    <Stack className="max-w-xl">
      <Row label="a long note keeps the buttons on its row" className="block">
        <DialogFooter
          onClose={noop}
          onSubmit={noop}
          submitLabel="Generate"
          submitIcon="refresh"
          note="Two drawings are not reviewed yet: the pack covers the reviewed ones."
        />
      </Row>
    </Stack>
  );
}
