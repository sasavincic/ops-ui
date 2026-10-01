"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { useReadOnlyScope } from "../config/read-only";
import { useOpsUi } from "../config/provider";
import { EN_OPTIONAL_STRINGS } from "../config/strings";
import { controlClasses } from "./field";
import { CONTROL_SIZE_CLASS, TOUCH_FLOOR, type ControlSize } from "../lib/touch";
import { localTodayIso } from "../lib/date-input";
import {
  anchorYear,
  isYearString,
  maskTypedYear,
  parseTypedYear,
  yearKeyTarget,
  yearPageStart,
  yearWithin,
} from "../lib/year-input";
import { fmt } from "../lib/fmt";
import { useDismissable } from "../lib/use-dismissable";
import { cn } from "../lib/cn";
import { floatingTop } from "../lib/floating-place";
import { riseSheet } from "../lib/sheet-motion";

/**
 * The house year input (1.4.0; PrefabOps restyle plan G13, D5): a manufacture year, a year of
 * construction. DateInput's sibling and built the same way: the field TAKES four digits (two are
 * read as DateInput reads a two-digit year; anything unreadable snaps back when the field is
 * left) and HANDS BACK the four-digit string: a hidden input under `name` carries it for form
 * posts, and `onChange` receives `{ target: { value } }` ("" when cleared).
 *
 * The picker is the page of twelve years DateInput's calendar shows when its title steps up to
 * years: three to a row, earlier / later pages, "This year" and Clear below, years outside
 * min/max cannot be picked. On a desktop it floats at the field (opens below or above); ↓ moves
 * into it, arrows walk a year or a row, PageUp / PageDown a page, Home / End the page's ends,
 * Enter picks, Escape closes. On a touch screen a tap opens it as a bottom sheet (its own modal
 * <dialog> in the top layer) and never the keyboard. Read-only aware like every kit field.
 *
 * Something outside the component that writes the hidden input dispatches an `input` event on it
 * and the field follows (DateInput's contract).
 */
export type YearInputChange = { target: { value: string; name?: string } };

function subscribeCoarse(onChange: () => void) {
  const mq = window.matchMedia("(pointer: coarse)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const coarseNow = () => window.matchMedia("(pointer: coarse)").matches;
const thisYear = () => Number(localTodayIso().slice(0, 4));

export function YearInput({
  id,
  name,
  value,
  defaultValue,
  onChange,
  min,
  max,
  disabled,
  required,
  placeholder,
  className,
  readOnlySafe,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  size = "md",
}: {
  id?: string;
  name?: string;
  /** Controlled four-digit year ("2026"; "" = empty). */
  value?: string;
  /** Uncontrolled initial year. */
  defaultValue?: string;
  onChange?: (event: YearInputChange) => void;
  /** The earliest year that may be picked; a typed year before it marks the field invalid. */
  min?: number;
  /** The latest year that may be picked. */
  max?: number;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  /** Sizes the field (widths), like the className an input takes. */
  className?: string;
  readOnlySafe?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
  /** "md" (default) or "lg" (48px, 16px text). */
  size?: ControlSize;
}) {
  const { strings } = useOpsUi();
  const dp = strings.datePicker;
  const yp = strings.yearPicker ?? EN_OPTIONAL_STRINGS.yearPicker;
  const locked = useReadOnlyScope() && !readOnlySafe;
  const off = disabled || locked;
  const coarse = useSyncExternalStore(subscribeCoarse, coarseNow, () => false);

  const controlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue ?? "");
  const year = controlled ? (value ?? "") : inner;
  const [text, setText] = useState(year);
  // Derive during render: a new value from outside rewrites the text, unless the text already
  // says that year (the person is typing it).
  const [shownYear, setShownYear] = useState(year);
  if (year !== shownYear) {
    setShownYear(year);
    if (text !== year) setText(year);
  }

  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const selfEvent = useRef(false);

  function commit(next: string) {
    if (next === year) return;
    if (!controlled) setInner(next);
    onChange?.({ target: { value: next, name } });
    // The Dialog kit's unsaved-changes check listens for input events.
    const hidden = hiddenRef.current;
    if (hidden) {
      hidden.value = next;
      selfEvent.current = true;
      hidden.dispatchEvent(new Event("input", { bubbles: true }));
      selfEvent.current = false;
    }
  }
  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  });
  useEffect(() => {
    const hidden = hiddenRef.current;
    if (!hidden) return;
    const follow = () => {
      if (selfEvent.current) return;
      const v = hidden.value;
      if (v === "" || isYearString(v)) commitRef.current(v);
    };
    hidden.addEventListener("input", follow);
    return () => hidden.removeEventListener("input", follow);
  }, []);

  const yearNumber = isYearString(year) ? Number(year) : null;
  const outOfRange = yearNumber !== null && !yearWithin(yearNumber, min, max);
  const rangeMessage = outOfRange
    ? min != null && yearNumber! < min
      ? fmt(dp.earliest, { date: String(min) })
      : fmt(dp.latest, { date: String(max) })
    : "";
  useEffect(() => {
    inputRef.current?.setCustomValidity(rangeMessage);
  }, [rangeMessage]);

  // ---- picker ------------------------------------------------------------
  const [open, setOpen] = useState(false);
  const [pageStart, setPageStart] = useState(2016);
  const [focusYear, setFocusYear] = useState<number | null>(null);
  const [today, setToday] = useState(0);
  const [place, setPlace] = useState<{ top: number; left: number; maxHeight: number | null } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const panelId = useId();
  useDismissable(open, wrapRef, () => setOpen(false));

  function openPicker(moveFocus: boolean) {
    if (off) return;
    const now = thisYear();
    const anchor = anchorYear(yearNumber, now, min, max);
    setToday(now);
    setPageStart(yearPageStart(anchor));
    setFocusYear(moveFocus ? anchor : null);
    setPlace(null);
    setOpen(true);
  }
  function close(refocus: boolean) {
    setOpen(false);
    setFocusYear(null);
    if (refocus) inputRef.current?.focus();
  }
  function pick(next: string) {
    commit(next);
    setText(next);
    close(true);
  }

  // Measure before paint and follow the field while the page scrolls (DateInput's placement);
  // on touch screens the picker is a bottom sheet in the top layer.
  useLayoutEffect(() => {
    if (!open) return;
    if (coarse) {
      const sheet = sheetRef.current;
      if (sheet && !sheet.open) {
        sheet.showModal();
        riseSheet(sheet);
      }
      return;
    }
    const measure = () => {
      const field = wrapRef.current;
      const panel = panelRef.current;
      if (!field || !panel) return;
      const rect = field.getBoundingClientRect();
      const { top, maxHeight } = floatingTop(rect, panel.offsetHeight, window.innerHeight);
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - panel.offsetWidth - 8));
      setPlace({ top, left, maxHeight });
    };
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, coarse]);

  // Keyboard focus follows the focused year, once the panel is placed.
  const placed = coarse || place !== null;
  useEffect(() => {
    if (!open || focusYear === null || !placed) return;
    panelRef.current?.querySelector<HTMLButtonElement>(`[data-year="${focusYear}"]`)?.focus();
  }, [open, focusYear, pageStart, placed]);

  function moveFocus(next: number) {
    setFocusYear(next);
    const start = yearPageStart(next);
    if (start !== pageStart) setPageStart(start);
  }
  function onGridKey(e: React.KeyboardEvent) {
    if (focusYear === null) return;
    const next = yearKeyTarget(e.key, focusYear, e.shiftKey);
    if (next === null) return;
    e.preventDefault();
    moveFocus(next);
  }

  const navButton = (label: string, glyph: "prev" | "next", onClick: () => void) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-control text-ink-secondary hover:bg-surface-raised hover:text-ink"
    >
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={glyph === "prev" ? "M10 3 5 8l5 5" : "m6 3 5 5-5 5"} />
      </svg>
    </button>
  );
  const cellClasses = (picked: boolean, isDisabled: boolean) =>
    cn(
      "rounded-control text-sm transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      picked
        ? "bg-primary font-semibold text-white"
        : isDisabled
          ? "cursor-not-allowed text-ink-muted/50"
          : "text-ink hover:bg-surface-raised"
    );

  const asSheet = (panel: React.ReactNode) =>
    coarse ? (
      <dialog
        ref={sheetRef}
        aria-label={yp.openPicker}
        className="mx-0 mt-auto mb-0 w-full max-w-full rounded-t-container border-t border-border bg-bg px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-ink shadow-xl backdrop:bg-ink/30"
        onCancel={(e) => {
          e.preventDefault();
          close(true);
        }}
        onClick={(e) => {
          // A tap on the dimmed backdrop lands on the dialog element itself.
          if (e.target === e.currentTarget) close(false);
        }}
      >
        {panel}
      </dialog>
    ) : (
      panel
    );

  return (
    <div
      ref={wrapRef}
      className={cn("relative", className)}
      onBlur={(e) => {
        // Only focus MOVING elsewhere closes here; presses outside are useDismissable's.
        const next = e.relatedTarget as Node | null;
        if (open && next && !wrapRef.current?.contains(next)) setOpen(false);
      }}
    >
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode={coarse ? "none" : "numeric"}
        autoComplete="off"
        spellCheck={false}
        maxLength={4}
        placeholder={placeholder ?? yp.placeholder}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={outOfRange || undefined}
        role="combobox"
        aria-controls={panelId}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={rangeMessage || undefined}
        required={required}
        disabled={off}
        value={text}
        className={cn(controlClasses, CONTROL_SIZE_CLASS[size], "pr-9 tabular-nums", TOUCH_FLOOR.height, TOUCH_FLOOR.text)}
        onClick={() => {
          if (!open) openPicker(false);
        }}
        onChange={(e) => {
          const next = maskTypedYear(e.target.value);
          setText(next);
          if (next === "") commit("");
          else if (next.length === 4 && isYearString(next)) {
            commit(next);
            if (open) setPageStart(yearPageStart(Number(next)));
          }
        }}
        onBlur={() => {
          // Leaving the field settles it: two digits become their year, anything else unreadable
          // returns to the last good year.
          if (text === "" || text === year) return;
          const parsed = parseTypedYear(text, thisYear());
          if (parsed === null) setText(year);
          else {
            commit(String(parsed));
            setText(String(parsed));
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !e.shiftKey) {
            e.preventDefault();
            if (open) setFocusYear(anchorYear(yearNumber, thisYear(), min, max));
            else openPicker(true);
          } else if (e.key === "Escape" && open) {
            e.preventDefault();
            e.stopPropagation();
            close(false);
          } else if (e.key === "Enter" && open) {
            // Enter settles the typed year instead of submitting underneath.
            e.preventDefault();
            close(false);
          }
        }}
      />
      {!off && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={yp.openPicker}
          title={yp.openPicker}
          onClick={() => (open ? close(true) : openPicker(true))}
          className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-control text-ink-muted hover:bg-surface-raised hover:text-ink"
        >
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 3.5h11v10h-11zM5.5 1.8v3.2M10.5 1.8v3.2M2.5 6.8h11" />
          </svg>
        </button>
      )}
      {name && <input ref={hiddenRef} type="hidden" name={name} value={year} />}
      {!name && <input ref={hiddenRef} type="hidden" value={year} />}

      {open && asSheet(
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label={yp.openPicker}
          style={
            coarse
              ? undefined
              : place
                ? { top: place.top, left: place.left, maxHeight: place.maxHeight ?? undefined, overflowY: place.maxHeight ? "auto" : undefined }
                : { visibility: "hidden" }
          }
          className={cn(
            "bg-bg",
            coarse
              ? "mx-auto w-full max-w-[24rem]"
              : "fixed z-[var(--ops-z-calendar,50)] w-[18.5rem] rounded-container border border-border p-3 shadow-lg"
          )}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              close(true);
            }
          }}
          // Clicks inside keep the text field's focus where it was.
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).closest("button") === null) e.preventDefault();
          }}
        >
          <div className="mb-2 flex items-center justify-between gap-1">
            {navButton(dp.previousYears, "prev", () => setPageStart((s) => s - 12))}
            <span className="text-sm font-semibold text-ink tabular-nums">
              {pageStart} – {pageStart + 11}
            </span>
            {navButton(dp.nextYears, "next", () => setPageStart((s) => s + 12))}
          </div>

          <div className="grid grid-cols-3 gap-1" onKeyDown={onGridKey}>
            {Array.from({ length: 12 }, (_, i) => pageStart + i).map((y) => {
              const isDisabled = !yearWithin(y, min, max);
              const picked = y === yearNumber;
              const isToday = y === today;
              const tabbable = focusYear !== null ? y === focusYear : picked || (yearNumber === null && isToday);
              return (
                <button
                  key={y}
                  type="button"
                  data-year={y}
                  tabIndex={tabbable ? 0 : -1}
                  disabled={isDisabled}
                  aria-pressed={picked}
                  aria-current={isToday ? "date" : undefined}
                  onClick={() => pick(String(y))}
                  onFocus={() => setFocusYear(y)}
                  className={cn(
                    cellClasses(picked, isDisabled),
                    "h-11 tabular-nums",
                    isToday && !picked && "font-semibold text-primary ring-1 ring-primary/40 ring-inset"
                  )}
                >
                  {y}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <button
              type="button"
              disabled={!yearWithin(today, min, max)}
              onClick={() => pick(String(today))}
              className={cn("rounded-control font-medium text-primary hover:bg-primary-subtle disabled:cursor-not-allowed disabled:text-ink-muted disabled:hover:bg-transparent", coarse ? "px-4 py-2.5 text-sm" : "px-2 py-1 text-detail")}
            >
              {yp.thisYear}
            </button>
            {!required && year && (
              <button
                type="button"
                onClick={() => pick("")}
                className={cn("rounded-control font-medium text-ink-secondary hover:bg-surface-raised hover:text-ink", coarse ? "px-4 py-2.5 text-sm" : "px-2 py-1 text-detail")}
              >
                {dp.clear}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
