"use client";

import { useEffect, useState } from "react";
import { Button } from "../components/button";
import { Dialog, DialogBody, DialogError, DialogFooter } from "../components/dialog";
import { Field, Input } from "../components/field";
import { SheetError } from "../components/sheet";
import { dismissToast, ErrorToast, NoticeToast, pushToast, SuccessToast } from "../components/toast";
import { OpsUiProvider } from "../config/provider";
import type { Story } from "./index";
import { StoryToaster } from "./story-host";

function Stack() {
  useEffect(() => {
    const ids = [
      pushToast("danger", "End its active worksites first.", "Close", { label: "Show worksites", onClick: () => {} }),
      pushToast("warning", "The first working day is a Sunday."),
      pushToast("info", "Already planned: nothing changed."),
      pushToast("success", "Saved"),
    ];
    return () => ids.forEach(dismissToast);
  }, []);
  return (
    <div className="min-h-96">
      <p className="text-sm text-ink-secondary">The stack: bottom-right, newest last, over the page.</p>
      <StoryToaster />
    </div>
  );
}

function InDialog() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open dialog
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Finalize quote">
        <DialogBody>
          <p className="text-sm text-ink-secondary">The refusal is drawn inside the open dialog, above its backdrop.</p>
          <DialogError>The worksite already has a price starting on that date.</DialogError>
          <DialogFooter onClose={() => setOpen(false)} onSubmit={() => {}} submitLabel="Finalize" submitIcon="lock" variant="primary" />
        </DialogBody>
      </Dialog>
      <StoryToaster />
    </>
  );
}

function FieldMessage() {
  return (
    <div className="max-w-sm min-h-96">
      <Field label="PIN" htmlFor="toast-pin" error="Invalid PIN." hint="13 digits">
        <Input id="toast-pin" defaultValue="0101990" />
      </Field>
      <StoryToaster />
    </div>
  );
}

/** 1.7.0: under [data-ops-touch] on a phone each toast's ✕ is 44 x 44. */
function TouchFloorToasts() {
  useEffect(() => {
    const ids = [
      pushToast("danger", "End its active worksites first.", "Close"),
      pushToast("success", "Saved"),
    ];
    return () => ids.forEach(dismissToast);
  }, []);
  return (
    <div data-ops-touch="" className="min-h-96">
      <p className="text-sm text-ink-secondary">The stack under the touch floor.</p>
      <StoryToaster />
    </div>
  );
}

// An app's localize, as a stub dictionary: the server refuses in English and the sentence is the
// key (each app passes its own through OpsUiProvider). The hooks must show the translation.
const SL: Record<string, string> = {
  "End its active worksites first.": "Najprej zaključi aktivna delovišča.",
  "The lead already has a client record.": "Vodilo že ima zapis stranke.",
  "Already planned: nothing changed.": "Že načrtovano: nič se ni spremenilo.",
  Saved: "Shranjeno",
  "Invalid PIN.": "Neveljaven EMŠO.",
  "Read as 31-12-2027 (handwritten)": "Prebrano kot 31-12-2027 (ročno)",
};
const localize = (text: string) => SL[text] ?? text;

/**
 * The hooks that raise toasts from a component (ErrorToast, SheetError, NoticeToast, SuccessToast):
 * each raises its message, localized, while it is mounted; a new `trigger` raises an unchanged
 * message again; unmounting takes the toasts away.
 */
function RaisedByComponents() {
  const [mounted, setMounted] = useState(true);
  const [trigger, setTrigger] = useState(0);
  return (
    <OpsUiProvider localize={localize}>
      <div className="flex min-h-96 max-w-sm flex-col items-start gap-3">
        <p className="text-sm text-ink-secondary">Four hooks, their messages translated by the app&apos;s localize.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setTrigger((n) => n + 1)}>
            Submit again
          </Button>
          <Button variant="secondary" onClick={() => setMounted((m) => !m)}>
            {mounted ? "Unmount" : "Mount"}
          </Button>
        </div>
        {mounted && (
          <>
            <ErrorToast error="End its active worksites first." trigger={trigger} />
            <SheetError trigger={trigger}>The lead already has a client record.</SheetError>
            <NoticeToast message="Already planned: nothing changed." trigger={trigger} />
            <SuccessToast message="Saved" trigger={trigger} />
          </>
        )}
        <StoryToaster />
      </div>
    </OpsUiProvider>
  );
}

/** Field messages: an error is raised when it appears, a warning only on focus; focus re-raises. */
function FieldMessages() {
  return (
    <OpsUiProvider localize={localize}>
      <div className="flex min-h-96 max-w-sm flex-col gap-4">
        <Field label="PIN" htmlFor="hooks-pin" error="Invalid PIN." hint="13 digits">
          <Input id="hooks-pin" defaultValue="0101990" />
        </Field>
        <Field label="Valid to" htmlFor="hooks-valid" warning="Read as 31-12-2027 (handwritten)">
          <Input id="hooks-valid" defaultValue="31-12-2027" />
        </Field>
        <StoryToaster />
      </div>
    </OpsUiProvider>
  );
}

export const stories: Story[] = [
  { name: "Stack", render: () => <Stack /> },
  { name: "Inside an open dialog", render: () => <InDialog /> },
  { name: "A field's message", render: () => <FieldMessage /> },
  { name: "Raised by components, localized", render: () => <RaisedByComponents /> },
  { name: "Field messages, localized", render: () => <FieldMessages /> },
  { name: "Under the touch floor", render: () => <TouchFloorToasts /> },
];
