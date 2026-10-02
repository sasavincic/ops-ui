import Link from "next/link";
import { cn } from "../lib/cn";
import { TOUCH_FLOOR } from "../lib/touch";
import { SegmentedButton } from "../config/segmented-button";

/**
 * A choice between mutually exclusive views (DESIGN.md → Toggles). The
 * dispatch desk spelled this out four times — horizon, board/grid, all/open
 * requests, group-by — each an identical hand-built nav, which is how one
 * idiom drifts into four. It has a name now.
 *
 * Links keep direct navigation choices in the URL. Controlled buttons use
 * the same appearance for staged mobile drafts or pending workspace updates.
 * Options carry an icon only when the icon does work the label cannot.
 *
 * 1.8.0: `size="lg"` (48px, 16px text: an lg surface); under the touch floor
 * an option is at least 44 x 44 (a one-character option was ~30px wide); a
 * controlled Segmented whose choice is stored on the record says
 * `changesData` and is then disabled inside a read-only scope (unless
 * `readOnlySafe`). Without them it renders as in 1.7.
 */
export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  href: string;
  icon?: React.ReactNode;
};

/** The control's size (1.8.0): "md" (default) or "lg" (48px tall, 16px text). */
export type SegmentedSize = "md" | "lg";

export function Segmented<T extends string>({
  label,
  value,
  options,
  className,
  onValueChange,
  disabled,
  size = "md",
  changesData = false,
  readOnlySafe = false,
}: {
  /** Names the control for screen readers — it has no visible label. */
  label: string;
  value: T;
  className?: string;
  disabled?: boolean;
  /** 1.8.0: "lg" = 48px tall with 16px text (the workshop portal). */
  size?: SegmentedSize;
  /**
   * 1.8.0, controlled only: the choice changes data (a mode stored on the record), so inside a
   * read-only scope the options are disabled, like a Field. Default false: a view choice (a stage,
   * a staged filter) keeps working while reading.
   */
  changesData?: boolean;
  /** With `changesData`: stays enabled in a read-only scope anyway. */
  readOnlySafe?: boolean;
} & (
  | { options: SegmentedOption<T>[]; onValueChange?: never }
  | {
      options: Omit<SegmentedOption<T>, "href">[];
      onValueChange: (value: T) => void;
    }
)) {
  const lg = size === "lg";
  return (
    <div
      role={onValueChange ? "group" : "navigation"}
      aria-label={label}
      className={cn(
        // Never wider than its row: longer labels (Slovenian) scroll inside the control, like Tabs, instead of pushing the page sideways.
        "flex w-fit max-w-full shrink-0 items-center gap-0.5 overflow-x-auto rounded-control border border-border-strong p-0.5",
        lg && "min-h-12 items-stretch",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        const optionClass = cn(
          "inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-detail whitespace-nowrap transition-colors duration-150 pointer-coarse:py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50",
          TOUCH_FLOOR.height,
          // 1.8.0: at least 44px wide too under the floor, the label centred in it.
          TOUCH_FLOOR.width,
          "justify-center",
          lg && "px-4 text-base",
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
          <SegmentedButton
            key={option.value}
            active={active}
            disabled={disabled}
            changesData={changesData}
            readOnlySafe={readOnlySafe}
            className={optionClass}
            onClick={() => onValueChange(option.value)}
          >
            {content}
          </SegmentedButton>
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
