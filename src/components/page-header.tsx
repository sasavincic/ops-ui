import { BackLink } from "./back-link";
import { cn } from "../lib/cn";

export function PageHeader({
  title,
  meta,
  description,
  backHref,
  backLabel,
  onBackClick,
  actions,
  className,
}: {
  title: string;
  /** Badges or other inline elements rendered next to the title. */
  meta?: React.ReactNode;
  description?: string;
  backHref?: string;
  backLabel?: string;
  /** Editors intercept back-navigation, e.g. to confirm leaving unsaved edits. */
  onBackClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    // Phones: the actions ALWAYS sit under the description — one place on
    // every page (Saša, 2026-09-22: a flex-wrap row put a short "New
    // client" beside the title and a longer "New worksite" under it, so
    // three sibling lists had three header layouts). From sm the row sits
    // beside the title and wraps only when it must.
    <header className={cn("flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4", className)}>
      {/* 1.8.0: from sm the title block asks for 20rem and grows into the rest, so a long
          description wraps beside the actions instead of pushing them onto a row of their own
          (the row wrapped by the description's full one-line width). */}
      <div className="min-w-0 sm:grow sm:basis-80">
        {backHref && (
          // Contextual: returns to where the user came from when the
          // session trail knows it; the given href/label are the fallback.
          <BackLink href={backHref} label={backLabel} onBackClick={onBackClick} />
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-ink text-balance">
            {title}
          </h1>
          {meta}
        </div>
        {description && (
          <p className="mt-1 max-w-prose text-sm text-ink-secondary">
            {description}
          </p>
        )}
      </div>
      {actions && (
        // Wraps on narrow screens — four buttons don't fit a phone row.
        // (No shrink-0: a flex item that can't shrink never wraps.) The
        // group is right-aligned so the PRIMARY — always last — sits in the
        // same corner at every width (Saša, 2026-09-22: "right, on both").
        <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}
