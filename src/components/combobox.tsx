"use client";

import { useRef, useState } from "react";
import { Input } from "./field";
import { cn } from "../lib/cn";
import { Monogram } from "./monogram";
import { useOpsUi } from "../config/provider";
import { matchesAllWords } from "../lib/text";
import type { ControlSize } from "../lib/touch";

/** Supporting line under an option's label; the tone picks a token colour. */
export type ComboboxOptionLine = { text: string; tone?: "muted" | "warning" };

export type ComboboxOption = {
  value: string;
  label: string;
  /** Right-aligned monospace detail on the label row — a rate, a code. */
  meta?: string;
  /** Extra lines under the label (professions, "currently at {site}"). */
  lines?: ComboboxOptionLine[];
  /**
   * The company chip before the label — the kit Monogram, so "which
   * company" is drawn the same way here as on the worker list and the
   * board (one device, one meaning).
   */
  mark?: { code: string; tone?: "own" | "external"; title?: string };
  /**
   * Heading printed above the first option of a contiguous run — the
   * optgroup idiom ("Our companies" / "Subcontractors"). Options of one
   * group must sit together; the heading never repeats inside a run.
   */
  group?: string;
  /** Dimmed, announced with aria-disabled, and unselectable. */
  disabled?: boolean;
  /**
   * Extra words the search matches but the row does not print — a
   * country's English name and ISO code under its translated label, so
   * "Germany" and "DE" find Nemčija (2026-09-24).
   */
  keywords?: string;
};

/**
 * 1.8.0: under the touch floor an option is at least 44px tall (py-3 around one 20px line; it was
 * 36), so a finger picks the row it meant. Nothing changes on a fine pointer.
 */
const OPTION_FLOOR = "[@media(hover:none)_and_(pointer:coarse)]:in-data-ops-touch:py-3";

const LINE_TONE = {
  muted: "text-ink-muted",
  warning: "text-warning",
} as const;

/**
 * Does an option answer what was typed? Every WORD of the query must appear
 * somewhere in what the row shows (label, meta, chip, lines, keywords), in
 * any order, ignoring case, diacritics and punctuation (2026-09-25, Saša:
 * "Nguyen Dinh" did not find "Nguyen, Dinh Hai" — the whole query was
 * matched as one substring, and the comma broke it).
 */
export function comboboxOptionMatches(option: ComboboxOption, query: string): boolean {
  return matchesAllWords(
    query,
    option.label,
    option.meta,
    option.mark?.code,
    option.keywords,
    ...(option.lines ?? []).map((l) => l.text)
  );
}

/**
 * Searchable single-select: type to filter, click to choose. Controlled by
 * `value` (an option's value, or "" for none). Typing matches everything the
 * row SHOWS — the label and its supporting lines — so what you read is what
 * you can search for. Callers that need the whole selected record look it up
 * by value; the kit only ever hands back the value.
 */
export function Combobox({
  id,
  value,
  options,
  onChange,
  placeholder,
  clearLabel,
  tall = false,
  size,
}: {
  id?: string;
  value: string;
  options: ComboboxOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  /** Optional first row that selects "" — e.g. “Not a worker”. */
  clearLabel?: string;
  /**
   * A longer result list that sits in the page flow instead of floating —
   * for a picker that IS the dialog (the deploy dialog's worker step,
   * 2026-09-25), so the dialog grows to show many names at once.
   */
  tall?: boolean;
  /** The input's size (1.3.0): "md" (default) or "lg" (48px, 16px text). */
  size?: ControlSize;
}) {
  const { strings } = useOpsUi();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // The highlight shows only once the person is steering — typing or arrows.
  const [steering, setSteering] = useState(false);
  const effectivePlaceholder = placeholder ?? `${strings.search}…`;
  const selected = options.find((o) => o.value === value) ?? null;
  const matches = query.trim()
    ? options.filter((o) => comboboxOptionMatches(o, query))
    : options;

  function pick(next: string) {
    // 1.8.0: a pick is an edit. The Dialog's (and Sheet's) discard guard listens for input /
    // change events, and a pick by pointer or Enter fires neither, so a dialog whose only change
    // was a pick closed without asking. Announce it as an input event (React's onInput; the value
    // tracker sees no typed change, so no onChange fires anywhere).
    if (next !== value) rootRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
    onChange(next);
    setQuery("");
    setOpen(false);
    setActive(0);
    setSteering(false);
  }

  // Keyboard (2026-09-24): typing then Enter used to SUBMIT the form with
  // nothing picked. Arrows move through what is listed, Enter picks the
  // highlighted row, Escape closes the list without touching the value.
  const pickable = matches.filter((o) => !o.disabled);
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      if (pickable.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      // The first arrow press lands on the first row rather than skipping it.
      if (steering) setActive((i) => (i + step + pickable.length) % pickable.length);
      setSteering(true);
    } else if (e.key === "Enter" && open && steering) {
      e.preventDefault();
      const choice = pickable[Math.min(active, pickable.length - 1)];
      if (choice) pick(choice.value);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  }
  const activeValue =
    open && steering ? pickable[Math.min(active, pickable.length - 1)]?.value : undefined;

  return (
    <div ref={rootRef} className="relative">
      <Input
        id={id}
        size={size}
        value={selected ? selected.label : query}
        placeholder={effectivePlaceholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange("");
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
          setSteering(e.target.value.trim() !== "");
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <ul
          role="listbox"
          // Shorter list on phones so the input plus a few options stay
          // visible above the on-screen keyboard inside dialogs.
          // A tall list sits IN the flow (the dialog grows to hold it): as
          // a floating panel inside a short dialog it was clipped to one
          // visible name (Saša, 2026-09-25).
          className={cn(
            "mt-1 w-full overflow-auto rounded-control border border-border bg-bg py-1",
            tall
              ? "max-h-64 sm:max-h-96"
              : "absolute z-20 max-h-40 shadow-lg sm:max-h-64"
          )}
        >
          {clearLabel && (
            <li
              role="option"
              aria-selected={value === ""}
              className={cn("cursor-pointer px-3 py-2 text-sm text-ink-secondary hover:bg-surface-raised", OPTION_FLOOR)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick("");
              }}
            >
              {clearLabel}
            </li>
          )}
          {matches.length === 0 && (
            <li className="px-3 py-2 text-sm text-ink-muted">{strings.noMatches}</li>
          )}
          {matches.map((o, i) => {
            const heading =
              o.group && o.group !== matches[i - 1]?.group ? o.group : null;
            const label = o.mark ? (
              <span className="inline-flex items-center gap-2">
                <Monogram code={o.mark.code} tone={o.mark.tone} title={o.mark.title} />
                <span>{o.label}</span>
              </span>
            ) : (
              <span>{o.label}</span>
            );
            return (
              <li key={o.value} className="contents">
                {heading && (
                  <span
                    role="presentation"
                    className="block px-3 pt-2 pb-1 text-micro font-medium uppercase tracking-wide text-ink-muted"
                  >
                    {heading}
                  </span>
                )}
                <span
                  role="option"
                  aria-selected={o.value === value}
                  aria-disabled={o.disabled || undefined}
                  ref={o.value === activeValue ? (el) => el?.scrollIntoView({ block: "nearest" }) : undefined}
                  className={cn(
                    o.disabled
                      ? "block px-3 py-2 text-sm text-ink opacity-50"
                      : o.value === activeValue
                        ? "block cursor-pointer bg-surface-raised px-3 py-2 text-sm text-ink"
                        : "block cursor-pointer px-3 py-2 text-sm text-ink hover:bg-surface-raised",
                    OPTION_FLOOR
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (o.disabled) return;
                    pick(o.value);
                  }}
                >
                  {o.meta ? (
                    <span className="flex items-baseline justify-between gap-3">
                      {label}
                      <span className="shrink-0 font-mono text-detail text-ink-secondary">
                        {o.meta}
                      </span>
                    </span>
                  ) : (
                    label
                  )}
                  {o.lines?.map((line, j) => (
                    <span
                      key={j}
                      className={`block text-detail ${LINE_TONE[line.tone ?? "muted"]}`}
                    >
                      {line.text}
                    </span>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
