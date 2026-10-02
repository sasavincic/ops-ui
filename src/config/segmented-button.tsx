"use client";

import { useReadOnlyScope } from "./read-only";

/**
 * One option of a controlled `Segmented` (1.8.0): the client leaf that reads the read-only scope,
 * so `Segmented` itself stays server-safe (as `Tabs` renders its links into `config/tabs-nav`).
 * With `changesData` (and without `readOnlySafe`) a read-only scope disables it.
 */
export function SegmentedButton({
  active,
  disabled,
  changesData,
  readOnlySafe,
  className,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  changesData: boolean;
  readOnlySafe: boolean;
  className: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const readOnly = useReadOnlyScope();
  const locked = changesData && readOnly && !readOnlySafe;
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled || locked}
      className={className}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
