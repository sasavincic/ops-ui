"use client";

import { useState } from "react";
import { Badge } from "../components/badge";
import { Button } from "../components/button";
import { Field, Input, Textarea } from "../components/field";
import { DialogFooter } from "../components/dialog";
import { Sheet, SheetBody, SheetFooter } from "../components/sheet";
import type { Story } from "./index";

function Demo() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button variant="secondary" icon="view" onClick={() => setOpen(true)}>
        Open lead
      </Button>
      {open && (
        <Sheet
          title="Ates GmbH"
          badge={
            <Badge variant="info" icon="send">
              Contacted
            </Badge>
          }
          headerActions={
            <Button variant="ghost" size="sm" icon="forward" readOnlySafe>
              Next
            </Button>
          }
          toolbar={<p className="border-b border-border px-5 py-2 text-detail text-ink-muted">Lead since 12-08-2026 · Germany</p>}
          exitCheck
          onClose={() => setOpen(false)}
        >
          <SheetBody>
            <Field label="Contact person" htmlFor="sheet-contact">
              <Input id="sheet-contact" defaultValue="Ms Ates" />
            </Field>
            <Field label="Notes" htmlFor="sheet-notes">
              <Textarea id="sheet-notes" defaultValue="Wants 4 welders from October." />
            </Field>
            <div className="flex justify-end">
              <Button variant="secondary" icon="save">
                Save
              </Button>
            </div>
            <SheetFooter>
              <Button variant="ghostDanger" icon="delete">
                Delete lead
              </Button>
            </SheetFooter>
          </SheetBody>
        </Sheet>
      )}
    </>
  );
}

export const stories: Story[] = [
  { name: "Open", render: () => <Demo /> },
  { name: "Pinned footer", render: () => <PinnedFooter /> },
];

/** 1.8.0: the commit pinned under the scroller (`footer`), the body's form targeted by id. */
function PinnedFooter() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button variant="secondary" icon="view" onClick={() => setOpen(true)}>
        Review material cost
      </Button>
      {open && (
        <Sheet
          title="Material cost review"
          onClose={() => setOpen(false)}
          exitCheck
          footer={<DialogFooter form="story-sheet-form" onClose={() => setOpen(false)} submitLabel="Apply prices" />}
        >
          <form id="story-sheet-form" onSubmit={(e) => { e.preventDefault(); setOpen(false); }}>
            <SheetBody>
              {Array.from({ length: 12 }, (_, i) => (
                <Field key={i} label={`Article ${i + 1}`} htmlFor={`sheet-article-${i}`}>
                  <Input id={`sheet-article-${i}`} defaultValue={`${(12.4 + i).toFixed(2)} €/kg`} />
                </Field>
              ))}
            </SheetBody>
          </form>
        </Sheet>
      )}
    </>
  );
}
