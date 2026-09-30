"use client";

import { ActionIcon } from "./action-icon";
import { pushToast } from "./toast";
import { useDict } from "@/i18n/client";
import { cn } from "../lib/cn";

/**
 * A value that copies itself (2026-09-11, Saša: document numbers). The
 * whole value is the button — the number IS the label, so this is not a
 * bare glyph — with a quiet copy mark; "Copied" / "Copy failed" arrive as a
 * toast (alerts are toasts, 2026-09-25). Changes no data, so it stays visible in read-only scopes.
 * Keep every character visible for manual transcription, wrapping when needed.
 */
export function CopyValue({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const t = useDict();
  return (
    <button
      type="button"
      title={t.common.copyValue}
      aria-label={`${t.common.copyValue}: ${value}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          pushToast("success", `${t.common.copied}: ${value}`, t.common.close);
        } catch {
          pushToast("danger", t.common.copyFailed, t.common.close);
        }
      }}
      className={cn(
        "group/copy inline-flex max-w-full items-center gap-1.5 rounded-control px-1.5 py-0.5 -mx-1.5 text-left font-mono text-detail text-ink transition-colors duration-150 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
        className
      )}
    >
      <span className="min-w-0 whitespace-normal [overflow-wrap:anywhere]">{value}</span>
      <ActionIcon
        name="copy"
        className="text-ink-muted opacity-60 group-hover/copy:opacity-100"
      />
    </button>
  );
}
