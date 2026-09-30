"use client";

// The shape of every record detail tab (doctrine 2026-08-27). Tabs had
// drifted into three different chromes — Cards with a primary button in
// each header, bare tables, and an intro row above a table — so a user
// who learned one tab could not predict the next. This is the one shape:
// a line saying what the tab is for, its single create action, then the
// content.

import {
  WriteScope,
  useReadOnlyScope,
} from "@/components/permissions-provider";
import { Button } from "./button";
import type { PermissionArea } from "@/domain/permissions";

export function RecordTab({
  area,
  intro,
  action,
  children,
}: {
  /**
   * The permission area this tab writes to — required, so adding a tab
   * cannot forget it (2026-08-28). Everything inside becomes default-deny
   * for a session without edit rights here: the create action and every
   * per-row Edit/Delete disappear rather than leading to an error page.
   */
  area: PermissionArea;
  /** One line: what this tab holds and what to do with it. */
  intro?: React.ReactNode;
  /**
   * The tab's actions, top-right. Normally the single create; a tab may
   * put a quieter companion beside it (ghost / ghostDanger), never a
   * second primary.
   */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <WriteScope area={area}>
      <RecordTabLayout intro={intro} action={action}>
        {children}
      </RecordTabLayout>
    </WriteScope>
  );
}

function RecordTabLayout({
  intro,
  action,
  children,
}: {
  intro?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  // Inside the scope now, so the row can drop itself entirely: an empty
  // flex row would still eat the gap above the table.
  const shown = useReadOnlyScope() ? undefined : action;
  return (
    <div className="flex flex-col gap-3">
      {/* Phones stack: side by side, two buttons squeeze the intro into a
          one-word column and push the page sideways. `min-w-0` keeps a long
          intro from doing the same to the buttons on wide screens. */}
      {(intro || shown) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <p className="min-w-0 text-detail text-ink-secondary">{intro}</p>
          {shown && (
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
              {shown}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * The tab's create action. Primary by doctrine — it brings a new row
 * into existence — and the only primary the tab is allowed.
 */
export function RecordTabAction({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Button icon="add"
      size="sm"
      className="shrink-0 whitespace-nowrap"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}

/**
 * Why an action is unavailable, in place of the button. A disabled
 * control must say its reason as visible text: title tooltips do not
 * exist on touch (2026-08-17 mobile pass).
 */
export function RecordTabNote({ children }: { children: React.ReactNode }) {
  // No button, no reason it is missing: a read-only session is not waiting
  // for the condition to clear.
  if (useReadOnlyScope()) return null;
  return (
    <span className="shrink-0 text-detail text-ink-muted">{children}</span>
  );
}
