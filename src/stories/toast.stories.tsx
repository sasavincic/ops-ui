"use client";

import { useEffect, useState } from "react";
import { Button } from "../components/button";
import { Dialog, DialogBody, DialogError, DialogFooter } from "../components/dialog";
import { Field, Input } from "../components/field";
import { dismissToast, pushToast, Toaster } from "../components/toast";
import type { Story } from "./index";

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
      <Toaster />
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
      <Toaster />
    </>
  );
}

function FieldMessage() {
  return (
    <div className="max-w-sm min-h-96">
      <Field label="PIN" htmlFor="toast-pin" error="Invalid PIN." hint="13 digits">
        <Input id="toast-pin" defaultValue="0101990" />
      </Field>
      <Toaster />
    </div>
  );
}

export const stories: Story[] = [
  { name: "Stack", render: () => <Stack /> },
  { name: "Inside an open dialog", render: () => <InDialog /> },
  { name: "A field's message", render: () => <FieldMessage /> },
];
