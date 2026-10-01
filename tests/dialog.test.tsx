import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConfirmDialog, InlineConfirm } from "../src/components/confirm-dialog";
import { Dialog, DialogBody, DialogFooter } from "../src/components/dialog";
import { Sheet, SheetBody, SheetFooter } from "../src/components/sheet";
import { OpsUiProvider } from "../src/config/provider";
import { EN_STRINGS } from "../src/config/strings";

// The Dialog and Sheet as rendered on the server. The discard prompt, the ✕ and the
// guarded Cancel are browser behaviour: gallery/tests/behaviour.spec.ts.

const noop = () => {};
const buttons = (html: string) =>
  [...html.matchAll(/<button[^>]*>(.*?)<\/button>/g)].map((m) => m[1].replace(/<[^>]+>/g, ""));

describe("DialogFooter", () => {
  it("ghost Cancel first, the commit rightmost, secondary by default", () => {
    const html = renderToStaticMarkup(<DialogFooter onClose={noop} submitLabel="Save changes" />);
    expect(buttons(html)).toEqual(["Cancel", "Save changes"]);
    expect(html).toMatch(/<button class="[^"]*border-border-strong[^"]*" type="submit" data-ops-commit="">/);
    expect(html).toContain('data-action-icon="close"');
    expect(html).toContain('data-action-icon="check"');
  });

  it("pending says Saving… (or the caller's word) and disables the commit", () => {
    const html = renderToStaticMarkup(<DialogFooter onClose={noop} onSubmit={noop} submitLabel="Delete" pending />);
    expect(buttons(html)).toEqual(["Cancel", "Saving…"]);
    expect(html).toMatch(/type="button"[^>]*disabled=""/);
    const own = renderToStaticMarkup(
      <DialogFooter onClose={noop} submitLabel="Delete" pending pendingLabel="Deleting…" variant="danger" />,
    );
    expect(buttons(own)).toEqual(["Cancel", "Deleting…"]);
  });

  it("a relabelled escape goes back instead of discarding", () => {
    const html = renderToStaticMarkup(<DialogFooter onClose={noop} submitLabel="Confirm" closeLabel="Back to form" />);
    expect(buttons(html)).toEqual(["Back to form", "Confirm"]);
    expect(html).toContain('data-action-icon="back"');
    // It keeps the user's work: not a dismiss (1.1 markers, spec §12.4).
    expect(html).not.toContain("data-ops-dismiss");
    expect(html.match(/data-ops-commit=""/g)).toHaveLength(1);
  });

  it("1.1 markers: the Cancel is data-ops-dismiss, the commit data-ops-commit (attributes only)", () => {
    const tagOf = (html: string, label: string) => {
      const m = new RegExp(`<button([^>]*)>(?:(?!</button>).)*${label}</button>`).exec(html);
      return m?.[1] ?? "";
    };
    const html = renderToStaticMarkup(<DialogFooter onClose={noop} onSubmit={noop} submitLabel="Save changes" />);
    expect(tagOf(html, "Cancel")).toContain('data-ops-dismiss=""');
    expect(tagOf(html, "Cancel")).not.toContain("data-ops-commit");
    expect(tagOf(html, "Save changes")).toContain('data-ops-commit=""');
    expect(tagOf(html, "Save changes")).not.toContain("data-ops-dismiss");
    // Without the markers the markup is the 1.0 markup (no other data-ops attribute; the 1.3
    // touch floor's in-data-ops-touch is a class, not an attribute).
    const strip = (s: string) => s.replace(/ data-ops-(dismiss|commit)=""/g, "");
    expect(strip(html)).not.toMatch(/ data-ops-[a-z-]+=/);
  });

  it("speaks the provider's words", () => {
    const html = renderToStaticMarkup(
      <OpsUiProvider strings={{ ...EN_STRINGS, cancel: "Prekliči", saving: "Shranjujem…" }}>
        <DialogFooter onClose={noop} submitLabel="Shrani" pending />
      </OpsUiProvider>,
    );
    expect(buttons(html)).toEqual(["Prekliči", "Shranjujem…"]);
  });
});

describe("Dialog and ConfirmDialog on the server", () => {
  it("a closed <dialog> with its pinned header and the ✕ as the only close", () => {
    const html = renderToStaticMarkup(
      <Dialog open={false} onClose={noop} title="Edit worker">
        <DialogBody>
          <p>body</p>
        </DialogBody>
      </Dialog>,
    );
    expect(html).toMatch(/^<dialog class="[^"]*hidden[^"]*open:flex/);
    expect(html).toContain('<h2 class="text-sm font-semibold">Edit worker</h2>');
    expect(html).toContain('aria-label="Close"');
    expect(html).toContain("<p>body</p>");
  });

  it("ConfirmDialog: the sentence, then Cancel and a danger commit", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog open={false} onClose={noop} onConfirm={noop} title="Delete document" body="Delete A1 for Hodžić?" confirmLabel="Delete" />,
    );
    expect(html).toContain("Delete A1 for Hodžić?");
    expect(buttons(html).slice(-2)).toEqual(["Cancel", "Delete"]);
    expect(html).toContain("bg-danger");
    // Its buttons are DialogFooter's, so they carry the 1.1 markers too.
    expect(html.match(/data-ops-dismiss=""/g)).toHaveLength(1);
    expect(html.match(/data-ops-commit=""/g)).toHaveLength(1);
  });

  it("InlineConfirm: one quiet button, then the question in place", () => {
    const idle = renderToStaticMarkup(
      <InlineConfirm label="Delete" question="Delete this row?" confirmLabel="Delete" armed={false} onArm={noop} onConfirm={noop} />,
    );
    expect(buttons(idle)).toEqual(["Delete"]);
    const armed = renderToStaticMarkup(
      <InlineConfirm label="Delete" question="Delete this row?" confirmLabel="Delete" armed onArm={noop} onConfirm={noop} />,
    );
    expect(armed).toContain("Delete this row?");
    expect(buttons(armed)).toEqual(["Cancel", "Delete"]);
  });
});

describe("Sheet on the server", () => {
  it("renders open, with the title, the ✕ and the body", () => {
    const html = renderToStaticMarkup(
      <Sheet title="Hodžić, Aldin" onClose={noop}>
        <SheetBody>
          <p>section</p>
          <SheetFooter>footer</SheetFooter>
        </SheetBody>
      </Sheet>,
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain("Hodžić, Aldin");
    expect(html).toContain('aria-label="Close"');
    expect(html).toContain("<p>section</p>");
    expect(html).toContain("border-t border-border pt-3");
  });
});
