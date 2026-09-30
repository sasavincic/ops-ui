"use client";

import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/**
 * The page's search field (2026-09-05): a kit primitive so the decision is
 * made once — `type="search"` (which is what the `/` shortcut looks for),
 * the magnifier inside, and the `/` key hint on desktop that disappears the
 * moment the field is focused or holds text. Filtering only narrows what is
 * displayed, so it stays typable inside a read-only scope.
 */
export function SearchInput({
  className,
  wrapperClassName,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type"> & {
  /** Layout classes for the wrapper (width etc.); `className` styles the input. */
  wrapperClassName?: string;
}) {
  return (
    <span className={cn("group relative block w-full", wrapperClassName)}>
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted">
        <SearchIcon size={14} />
      </span>
      <Input
        type="search"
        readOnlySafe
        aria-keyshortcuts="/ Meta+Shift+F Control+Shift+F"
        {...props}
        className={cn("peer pl-8 lg:pr-8", className)}
      />
      {/* Hidden while focused or non-empty (pure CSS: placeholder-shown),
          and below lg, where there is no keyboard to hint at. */}
      <kbd
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-sm border border-border px-1.5 font-sans text-micro leading-5 text-ink-muted lg:block peer-focus:hidden peer-[:not(:placeholder-shown)]:hidden"
      >
        /
      </kbd>
    </span>
  );
}

export function SearchIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3 3" />
    </svg>
  );
}
