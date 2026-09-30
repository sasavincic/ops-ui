import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DialogError } from "../src/components/dialog";
import { Field, Input } from "../src/components/field";
import { SheetError } from "../src/components/sheet";
import {
  ErrorToast,
  NoticeToast,
  SuccessToast,
  currentToasts,
  dismissToast,
  pushToast,
} from "../src/components/toast";

// Ported from workforce-ops tests/ui/toast.test.tsx (spec §11.1), plus the
// lifetimes of every tone.
/**
 * Alerts are toasts (Saša, 2026-09-25): an action's refusal never sits in
 * the flow where it pushes the layout around.
 */
afterEach(() => {
  for (const t of currentToasts()) dismissToast(t.id);
  vi.useRealTimers();
});

describe("toast stack", () => {
  it("replaces the same message instead of stacking it", () => {
    pushToast("danger", "End its active worksites first.");
    pushToast("danger", "End its active worksites first.");
    expect(currentToasts()).toHaveLength(1);
  });

  it("stacks the same words in another tone", () => {
    pushToast("danger", "Refused.");
    pushToast("warning", "Refused.");
    expect(currentToasts().map((t) => t.tone)).toEqual(["danger", "warning"]);
  });

  it("keeps at most four, newest last", () => {
    for (const n of [1, 2, 3, 4, 5]) pushToast("danger", `Error ${n}`);
    expect(currentToasts().map((t) => t.message)).toEqual([
      "Error 2",
      "Error 3",
      "Error 4",
      "Error 5",
    ]);
  });

  it("dismisses by id", () => {
    const id = pushToast("danger", "Refused.");
    dismissToast(id);
    expect(currentToasts()).toHaveLength(0);
  });

  it("lets confirmations fade by themselves but keeps errors until dismissed", () => {
    vi.useFakeTimers();
    pushToast("success", "Saved");
    pushToast("danger", "Refused.");
    vi.advanceTimersByTime(7000);
    expect(currentToasts().map((t) => t.tone)).toEqual(["danger"]);
  });

  it("a confirmation lives six seconds; warnings and notices stay like errors", () => {
    vi.useFakeTimers();
    pushToast("success", "Saved");
    pushToast("warning", "Check the date.");
    pushToast("info", "Already planned.");
    vi.advanceTimersByTime(5999);
    expect(currentToasts().map((t) => t.tone)).toEqual(["success", "warning", "info"]);
    vi.advanceTimersByTime(1);
    expect(currentToasts().map((t) => t.tone)).toEqual(["warning", "info"]);
    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(currentToasts().map((t) => t.tone)).toEqual(["warning", "info"]);
  });

  it("the close label defaults to English and a caller's label wins", () => {
    pushToast("danger", "One.");
    pushToast("danger", "Two.", "Zapri");
    expect(currentToasts().map((t) => t.closeLabel)).toEqual(["Close", "Zapri"]);
  });
});

describe("error components render nothing in the flow", () => {
  it("ErrorToast, DialogError and SheetError take no space", () => {
    expect(renderToStaticMarkup(<ErrorToast error="Refused." />)).toBe("");
    expect(renderToStaticMarkup(<DialogError>Refused.</DialogError>)).toBe("");
    expect(renderToStaticMarkup(<SheetError>Refused.</SheetError>)).toBe("");
  });

  it("NoticeToast and SuccessToast take no space either", () => {
    expect(renderToStaticMarkup(<NoticeToast message="Refreshed." />)).toBe("");
    expect(renderToStaticMarkup(<SuccessToast message="Saved" />)).toBe("");
  });
});

describe("a field's message", () => {
  it("marks the field instead of adding a line under it", () => {
    const html = renderToStaticMarkup(
      <Field label="PIN" htmlFor="pin" error="Invalid PIN." hint="13 digits">
        <Input id="pin" />
      </Field>
    );
    expect(html).not.toContain("Invalid PIN.");
    expect(html).toContain("text-danger");
    expect(html).toContain('data-field-state="error"');
    // The hint stays put whether or not there is an error — nothing jumps.
    expect(html).toContain("13 digits");
  });

  it("a warning marks the field amber, and an error outranks it", () => {
    const warned = renderToStaticMarkup(
      <Field label="Valid to" htmlFor="v" warning="Read as 2027">
        <Input id="v" />
      </Field>
    );
    expect(warned).toContain('data-field-state="warning"');
    expect(warned).toContain("text-warning");
    expect(warned).not.toContain("Read as 2027");
    const both = renderToStaticMarkup(
      <Field label="Valid to" htmlFor="v" warning="Read as 2027" error="Required.">
        <Input id="v" />
      </Field>
    );
    expect(both).toContain('data-field-state="error"');
  });
});

describe("toast actions", () => {
  it("carries one follow-up act", () => {
    let clicked = 0;
    pushToast("danger", "Could not read the scan.", "Close", {
      label: "Read again",
      onClick: () => clicked++,
    });
    const [item] = currentToasts();
    item.action?.onClick();
    expect(item.action?.label).toBe("Read again");
    expect(clicked).toBe(1);
  });
});
