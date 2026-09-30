"use client";

import { useId, useRef, useState } from "react";
import { useDismissable } from "../lib/use-dismissable";

/** Quiet, keyboard-accessible reference help; never changes records. */
export function PageHelp({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useDismissable(open, ref, () => setOpen(false));
  return (
    <div ref={ref} className="relative shrink-0" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }} onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        event.stopPropagation();
        setOpen(false);
        trigger.current?.focus();
      }
    }}>
      <button ref={trigger} type="button" aria-label={label} title={label}
        aria-expanded={open} aria-controls={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-surface hover:text-ink-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary pointer-coarse:h-11 pointer-coarse:w-11">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="h-4 w-4">
          <circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.01"/>
        </svg>
      </button>
      {open && <div id={id} role="region" aria-label={label}
        className="absolute right-0 top-full z-30 mt-2 flex max-h-[60dvh] w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 overflow-y-auto rounded-container border border-border bg-bg p-3 text-detail text-ink-secondary shadow-lg">
        {children}
      </div>}
    </div>
  );
}
