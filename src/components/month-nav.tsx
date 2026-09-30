"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { shiftMonth } from "@/domain/months";
import { useDict, useLocale } from "@/i18n/client";
import { useDismissable } from "@/lib/use-dismissable";
import { cn } from "@/lib/utils";

/**
 * The ONE month navigator (Saša, 2026-09-07: "anywhere we use a month
 * selector and use arrows such as this the same styling should be used").
 * Arrows are quiet ghost glyphs — they change nothing, they move the view —
 * not bordered buttons that read as record actions. The month itself is a
 * button: it opens a year + month grid so a specific month is one click
 * away instead of twelve. Link-based: the month lives in the URL, so it
 * survives a reload and can be shared.
 */
export function MonthNav({
  month,
  hrefPattern,
  className,
}: {
  /** YYYY-MM. */
  month: string;
  /** URL with `{m}` where the month goes — serializable across the RSC boundary. */
  hrefPattern: string;
  className?: string;
}) {
  const t = useDict();
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(Number(month.slice(0, 4)));
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useDismissable(open, ref, () => setOpen(false));

  // A pattern built through URLSearchParams arrives percent-encoded
  // (`%7Bm%7D`) — accept both spellings so callers need not care.
  const hrefFor = (m: string) => hrefPattern.replace(/\{m\}|%7Bm%7D/gi, m);
  const label = (m: string) =>
    new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1)).toLocaleDateString(locale, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  const shortMonth = (i: number) =>
    new Date(Date.UTC(2000, i, 1)).toLocaleDateString(locale, { month: "short", timeZone: "UTC" });
  const thisMonth = new Date().toISOString().slice(0, 7);

  const pick = (m: string) => {
    setOpen(false);
    trigger.current?.focus();
    // View state of one page: replace, so the browser's back leaves the
    // page instead of re-walking every month stepped through.
    router.replace(hrefFor(m), { scroll: false });
  };

  return (
    <div
      ref={ref}
      className={cn("relative flex items-center gap-0.5", className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <ArrowLink href={hrefFor(shiftMonth(month, -1))} label={t.common.prevMonth} dir="prev" />
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        title={t.common.pickMonth}
        onClick={() => {
          setYear(Number(month.slice(0, 4)));
          setOpen((v) => !v);
        }}
        className="inline-flex h-8 min-w-32 items-center justify-center gap-1 rounded-control px-2 text-sm font-medium text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary pointer-coarse:h-9"
      >
        {label(month)}
        <Chevron dir="down" />
      </button>
      <ArrowLink href={hrefFor(shiftMonth(month, 1))} label={t.common.nextMonth} dir="next" />
      {open && (
        <div
          id={id}
          role="dialog"
          aria-label={t.common.pickMonth}
          className="absolute left-1/2 top-full z-30 mt-2 w-64 -translate-x-1/2 rounded-container border border-border bg-bg p-2 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label={t.common.prevYear}
              onClick={() => setYear((y) => y - 1)}
              className={ARROW}
            >
              <Chevron dir="prev" />
            </button>
            <span className="text-sm font-medium text-ink">{year}</span>
            <button
              type="button"
              aria-label={t.common.nextYear}
              onClick={() => setYear((y) => y + 1)}
              className={ARROW}
            >
              <Chevron dir="next" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 12 }, (_, i) => {
              const m = `${year}-${String(i + 1).padStart(2, "0")}`;
              const selected = m === month;
              const current = m === thisMonth;
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => pick(m)}
                  className={cn(
                    "h-9 rounded-control text-detail capitalize transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
                    selected
                      ? "bg-primary font-medium text-white"
                      : "text-ink hover:bg-surface",
                    current && !selected && "border border-border-strong"
                  )}
                >
                  {shortMonth(i)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const ARROW =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-ink-secondary transition-colors duration-150 hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary pointer-coarse:h-9 pointer-coarse:w-9";

function ArrowLink({ href, label, dir }: { href: string; label: string; dir: "prev" | "next" }) {
  return (
    <Link href={href} aria-label={label} title={label} scroll={false} className={ARROW}>
      <Chevron dir={dir} />
    </Link>
  );
}

function Chevron({ dir }: { dir: "prev" | "next" | "down" }) {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {dir === "prev" && <path d="m10 3-5 5 5 5" />}
      {dir === "next" && <path d="m6 3 5 5-5 5" />}
      {dir === "down" && <path d="m4 6 4 4 4-4" />}
    </svg>
  );
}
