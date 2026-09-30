"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { useReadOnlyScope } from "@/components/permissions-provider";
import { controlClasses } from "./field";
import {
  isIsoDate,
  localTodayIso,
  maskTypedDate,
  monthGrid,
  parseTypedDate,
  shiftDayByMonths,
  shiftMonth,
  withinRange,
} from "@/domain/date-input";
import { formatDate, shiftDay } from "@/domain/dates";
import { useDict } from "@/i18n/client";
import { fmt } from "@/i18n/locales";
import { useDismissable } from "@/lib/use-dismissable";
import { cn } from "../lib/cn";

/**
 * The house date input (2026-09-28, Saša: "we shouldn't rely on the browser
 * but have our own"). It replaces every <input type="date">: the browser's
 * picker looked different in every browser, printed the date in the
 * browser's locale (09/28/2026 on an English Mac) while every screen of the
 * app says 28-09-2026, and on iOS could not be cleared.
 *
 * The field SHOWS and TAKES DD-MM-YYYY (typed leniently — "28.9.26",
 * "280926"; digits alone gain their dashes) and HANDS BACK ISO, exactly what
 * the native input posted: a hidden input under `name` carries the ISO
 * value for form posts, and `onChange` receives `{ target: { value } }`, so
 * a call site swaps `<Input type="date">` for `<DateInput>` and nothing
 * else. Unparseable text snaps back to the last good date when the field is
 * left — a garbage date can never be posted.
 *
 * The calendar floats (position: fixed at the field, the RowMenu idiom — a
 * dialog body would clip it), opens below or above, weeks start on Monday,
 * the title steps up to months and years (a birth date is three taps), and
 * min/max days cannot be picked. On a touch screen a tap opens the calendar
 * without the keyboard; on a desktop a click opens it and typing still
 * works, ↓ moves into it, arrows / PageUp / PageDown walk the days.
 *
 * Something outside the component that writes the hidden input (the scan
 * reader fills forms by field name) dispatches an `input` event on it and
 * the field follows.
 */
export type DateInputChange = { target: { value: string; name?: string } };

type View = { year: number; month: number };
type Mode = "days" | "months" | "years";

function subscribeCoarse(onChange: () => void) {
  const mq = window.matchMedia("(pointer: coarse)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const coarseNow = () => window.matchMedia("(pointer: coarse)").matches;

export function DateInput({
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
}: {
  id?: string;
  name?: string;
  /** Controlled ISO value ("" = empty). */
  value?: string;
  /** Uncontrolled initial ISO value. */
  defaultValue?: string;
  onChange?: (event: DateInputChange) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  /** Sizes the field (widths), like the className an input took. */
  className?: string;
  readOnlySafe?: boolean;
  "aria-label"?: string;
}) {
  const t = useDict();
  const dp = t.common.datePicker;
  const locked = useReadOnlyScope() && !readOnlySafe;
  const off = disabled || locked;
  const coarse = useSyncExternalStore(subscribeCoarse, coarseNow, () => false);

  const controlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue ?? "");
  const iso = controlled ? (value ?? "") : inner;
  const [text, setText] = useState(() => (iso ? formatDate(iso) : ""));
  // Derive during render: a new value from outside rewrites the text, unless
  // the text already says that date (the person is typing it).
  const [shownIso, setShownIso] = useState(iso);
  if (iso !== shownIso) {
    setShownIso(iso);
    if (parseTypedDate(text, localTodayIso()) !== iso) setText(iso ? formatDate(iso) : "");
  }

  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const selfEvent = useRef(false);

  function commit(next: string) {
    if (next === iso) return;
    if (!controlled) setInner(next);
    onChange?.({ target: { value: next, name } });
    // The Dialog kit's unsaved-changes check listens for input events; a
    // pick in the calendar would otherwise leave the dialog "clean".
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
      if (v === "" || isIsoDate(v)) commitRef.current(v);
    };
    hidden.addEventListener("input", follow);
    return () => hidden.removeEventListener("input", follow);
  }, []);

  const outOfRange = iso !== "" && !withinRange(iso, min, max);
  const rangeMessage = outOfRange
    ? min && iso < min
      ? fmt(dp.earliest, { date: formatDate(min) })
      : fmt(dp.latest, { date: formatDate(max!) })
    : "";
  useEffect(() => {
    inputRef.current?.setCustomValidity(rangeMessage);
  }, [rangeMessage]);

  // ---- calendar ----------------------------------------------------------
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("days");
  const [view, setView] = useState<View>({ year: 2000, month: 1 });
  const [focusDay, setFocusDay] = useState<string | null>(null);
  const [today, setToday] = useState("");
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  useDismissable(open, wrapRef, () => setOpen(false));

  function openCalendar(moveFocus: boolean) {
    if (off) return;
    const now = localTodayIso();
    const anchor = iso && isIsoDate(iso)
      ? iso
      : min && now < min
        ? min
        : max && now > max
          ? max
          : now;
    setToday(now);
    setView({ year: Number(anchor.slice(0, 4)), month: Number(anchor.slice(5, 7)) });
    setMode("days");
    setFocusDay(moveFocus ? anchor : null);
    setPlace(null);
    setOpen(true);
  }
  function close(refocus: boolean) {
    setOpen(false);
    setFocusDay(null);
    if (refocus) inputRef.current?.focus();
  }
  function pick(next: string) {
    commit(next);
    setText(next ? formatDate(next) : "");
    close(true);
  }

  // Measure before paint; follow the field while the page or dialog scrolls.
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const field = wrapRef.current;
      const panel = panelRef.current;
      if (!field || !panel) return;
      const rect = field.getBoundingClientRect();
      const height = panel.offsetHeight;
      const width = panel.offsetWidth;
      const gap = 4;
      const below = rect.bottom + gap;
      const top =
        below + height > window.innerHeight - 8 && rect.top - gap - height >= 8
          ? rect.top - gap - height
          : below;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      setPlace({ top, left });
    };
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, mode]);

  // Keyboard focus follows the focused day.
  // Only once placed: a panel still hidden for measuring cannot take focus.
  const placed = place !== null;
  useEffect(() => {
    if (!open || !focusDay || !placed) return;
    panelRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focusDay}"]`)?.focus();
  }, [open, focusDay, view, placed]);

  function moveFocus(next: string) {
    setFocusDay(next);
    const v = { year: Number(next.slice(0, 4)), month: Number(next.slice(5, 7)) };
    if (v.year !== view.year || v.month !== view.month) setView(v);
  }
  function onGridKey(e: React.KeyboardEvent) {
    if (!focusDay) return;
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key in step) {
      e.preventDefault();
      moveFocus(shiftDay(focusDay, step[e.key]));
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      moveFocus(shiftDayByMonths(focusDay, (e.key === "PageUp" ? -1 : 1) * (e.shiftKey ? 12 : 1)));
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      const weekday = (new Date(`${focusDay}T00:00:00Z`).getUTCDay() + 6) % 7;
      moveFocus(shiftDay(focusDay, e.key === "Home" ? -weekday : 6 - weekday));
    }
  }

  const months = dp.months.split(",");
  const monthsShort = dp.monthsShort.split(",");
  const weekdays = dp.weekdays.split(",");
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const monthOverlaps = (y: number, m: number) => {
    const first = `${y}-${String(m).padStart(2, "0")}-01`;
    const last = shiftDay(shiftDayByMonths(first, 1), -1);
    return !(max && first > max) && !(min && last < min);
  };
  const yearOverlaps = (y: number) => !(max && `${y}-01-01` > max) && !(min && `${y}-12-31` < min);
  const yearPageStart = view.year - (((view.year % 12) + 12) % 12);

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

  return (
    <div
      ref={wrapRef}
      className={cn("relative", className)}
      onBlur={(e) => {
        // Only focus MOVING elsewhere (Tab) closes here. A click inside the
        // calendar blurs with no relatedTarget — Safari never focuses a
        // clicked button, and the panel's own padding takes no focus — so
        // "nothing" must not close it; presses outside are useDismissable's.
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
        placeholder={placeholder ?? dp.placeholder}
        aria-label={ariaLabel}
        aria-invalid={outOfRange || undefined}
        role="combobox"
        aria-controls={panelId}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={rangeMessage || undefined}
        required={required}
        disabled={off}
        value={text}
        className={cn(controlClasses, "h-9 pr-9 tabular-nums")}
        onClick={() => {
          if (!open) openCalendar(false);
        }}
        onChange={(e) => {
          const next = maskTypedDate(text, e.target.value);
          setText(next);
          if (next.trim() === "") commit("");
          else {
            const parsed = parseTypedDate(next, localTodayIso());
            if (parsed) {
              commit(parsed);
              if (open) setView({ year: Number(parsed.slice(0, 4)), month: Number(parsed.slice(5, 7)) });
            }
          }
        }}
        onBlur={() => {
          // Leaving the field settles it: a readable date is rewritten in the
          // house format, anything else returns to the last good date.
          const parsed = text.trim() ? parseTypedDate(text, localTodayIso()) : "";
          if (parsed === null) setText(iso ? formatDate(iso) : "");
          else if (parsed) setText(formatDate(parsed));
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !e.shiftKey) {
            e.preventDefault();
            if (open) setFocusDay(iso && isIsoDate(iso) ? iso : localTodayIso());
            else openCalendar(true);
          } else if (e.key === "Escape" && open) {
            e.preventDefault();
            e.stopPropagation();
            close(false);
          } else if (e.key === "Enter" && open) {
            // Enter settles the typed date instead of submitting underneath.
            e.preventDefault();
            close(false);
          }
        }}
      />
      {!off && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={dp.openCalendar}
          title={dp.openCalendar}
          onClick={() => (open ? close(true) : openCalendar(true))}
          className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-control text-ink-muted hover:bg-surface-raised hover:text-ink"
        >
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 3.5h11v10h-11zM5.5 1.8v3.2M10.5 1.8v3.2M2.5 6.8h11" />
          </svg>
        </button>
      )}
      {name && <input ref={hiddenRef} type="hidden" name={name} value={iso} />}
      {!name && <input ref={hiddenRef} type="hidden" value={iso} />}

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label={dp.openCalendar}
          style={place ? { top: place.top, left: place.left } : { visibility: "hidden" }}
          className="fixed z-50 w-[18.5rem] rounded-container border border-border bg-bg p-3 shadow-lg"
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
            {mode === "days" &&
              navButton(dp.previousMonth, "prev", () => setView((v) => shiftMonth(v, -1)))}
            {mode === "months" &&
              navButton(dp.previousYear, "prev", () => setView((v) => ({ ...v, year: v.year - 1 })))}
            {mode === "years" &&
              navButton(dp.previousYears, "prev", () => setView((v) => ({ ...v, year: v.year - 12 })))}
            {mode === "years" ? (
              <span className="text-sm font-semibold text-ink tabular-nums">
                {yearPageStart} – {yearPageStart + 11}
              </span>
            ) : (
              <button
                type="button"
                title={dp.chooseMonth}
                onClick={() => setMode(mode === "days" ? "months" : "years")}
                className="inline-flex items-center gap-1 rounded-control px-2 py-1 text-sm font-semibold text-ink hover:bg-surface-raised"
              >
                {mode === "days" ? `${cap(months[view.month - 1])} ${view.year}` : view.year}
                <svg aria-hidden="true" width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
                  <path d="m4 6 4 4 4-4" />
                </svg>
              </button>
            )}
            {mode === "days" &&
              navButton(dp.nextMonth, "next", () => setView((v) => shiftMonth(v, 1)))}
            {mode === "months" &&
              navButton(dp.nextYear, "next", () => setView((v) => ({ ...v, year: v.year + 1 })))}
            {mode === "years" &&
              navButton(dp.nextYears, "next", () => setView((v) => ({ ...v, year: v.year + 12 })))}
          </div>

          {mode === "days" && (
            <div onKeyDown={onGridKey}>
              <div className="grid grid-cols-7 gap-0.5 pb-1 text-center text-micro font-medium text-ink-muted">
                {weekdays.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {monthGrid(view.year, view.month).map((day) => {
                  const inMonth = Number(day.slice(5, 7)) === view.month;
                  const isDisabled = !withinRange(day, min, max);
                  const picked = day === iso;
                  const isToday = day === today;
                  const tabbable = focusDay ? day === focusDay : picked || (!iso && isToday);
                  return (
                    <button
                      key={day}
                      type="button"
                      data-day={day}
                      tabIndex={tabbable ? 0 : -1}
                      disabled={isDisabled}
                      aria-label={formatDate(day)}
                      aria-pressed={picked}
                      aria-current={isToday ? "date" : undefined}
                      onClick={() => pick(day)}
                      onFocus={() => setFocusDay(day)}
                      className={cn(
                        cellClasses(picked, isDisabled),
                        "h-9 tabular-nums",
                        !picked && !isDisabled && !inMonth && "text-ink-muted",
                        isToday && !picked && "font-semibold text-primary ring-1 ring-primary/40 ring-inset"
                      )}
                    >
                      {Number(day.slice(8))}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {mode === "months" && (
            <div className="grid grid-cols-3 gap-1">
              {monthsShort.map((m, i) => {
                const isDisabled = !monthOverlaps(view.year, i + 1);
                const picked = iso.startsWith(`${view.year}-${String(i + 1).padStart(2, "0")}`);
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      setView({ year: view.year, month: i + 1 });
                      setMode("days");
                    }}
                    className={cn(cellClasses(picked, isDisabled), "h-11")}
                  >
                    {cap(m)}
                  </button>
                );
              })}
            </div>
          )}

          {mode === "years" && (
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 12 }, (_, i) => yearPageStart + i).map((y) => {
                const isDisabled = !yearOverlaps(y);
                return (
                  <button
                    key={y}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      setView({ year: y, month: view.month });
                      setMode("months");
                    }}
                    className={cn(cellClasses(iso.startsWith(`${y}-`), isDisabled), "h-11 tabular-nums")}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <button
              type="button"
              disabled={!withinRange(today, min, max)}
              onClick={() => pick(today)}
              className="rounded-control px-2 py-1 text-detail font-medium text-primary hover:bg-primary-subtle disabled:cursor-not-allowed disabled:text-ink-muted disabled:hover:bg-transparent"
            >
              {dp.today}
            </button>
            {!required && iso && (
              <button
                type="button"
                onClick={() => pick("")}
                className="rounded-control px-2 py-1 text-detail font-medium text-ink-secondary hover:bg-surface-raised hover:text-ink"
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
