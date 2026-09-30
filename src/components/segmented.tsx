import Link from "next/link";
import { cn } from "../lib/cn";

/**
 * A choice between mutually exclusive views (DESIGN.md → Toggles). The
 * dispatch desk spelled this out four times — horizon, board/grid, all/open
 * requests, group-by — each an identical hand-built nav, which is how one
 * idiom drifts into four. It has a name now.
 *
 * Links keep direct navigation choices in the URL. Controlled buttons use
 * the same appearance for staged mobile drafts or pending workspace updates.
 * Options carry an icon only when the icon does work the label cannot.
 */
export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  href: string;
  icon?: React.ReactNode;
};

export function Segmented<T extends string>({
  label,
  value,
  options,
  className,
  onValueChange,
  disabled,
}: {
  /** Names the control for screen readers — it has no visible label. */
  label: string;
  value: T;
  className?: string;
  disabled?: boolean;
} & (
  | { options: SegmentedOption<T>[]; onValueChange?: never }
  | {
      options: Omit<SegmentedOption<T>, "href">[];
      onValueChange: (value: T) => void;
    }
)) {
  return (
    <div
      role={onValueChange ? "group" : "navigation"}
      aria-label={label}
      className={cn(
        // Never wider than its row: longer labels (Slovenian) scroll inside the control, like Tabs, instead of pushing the page sideways.
        "flex w-fit max-w-full shrink-0 items-center gap-0.5 overflow-x-auto rounded-control border border-border-strong p-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        const optionClass = cn(
          "inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-detail whitespace-nowrap transition-colors duration-150 pointer-coarse:py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50",
          active
            ? "bg-surface-raised font-medium text-ink"
            : "text-ink-secondary hover:text-ink",
        );
        const content = (
          <>
            {option.icon}
            {option.label}
          </>
        );
        return onValueChange ? (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            className={optionClass}
            onClick={() => onValueChange(option.value)}
          >
            {content}
          </button>
        ) : (
          <Link
            key={option.value}
            href={(option as SegmentedOption<T>).href}
            // View state of one page (horizon, grouping…): replaces the
            // history entry like the Tabs kit, so back leaves the page.
            replace
            aria-current={active ? "true" : undefined}
            className={optionClass}
          >
            {content}
          </Link>
        );
      })}
    </div>
  );
}
