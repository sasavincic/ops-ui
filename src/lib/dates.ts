// L2 import: formatDate and shiftDay, copied verbatim from workforce-ops origin/main (cea4928) src/domain/dates.ts.

/**
 * House display format for dates: DD-MM-YYYY (European), Saša 2026-07-14.
 * Applies to everything the app RENDERS. Storage, comparisons, date inputs
 * and URLs stay ISO (YYYY-MM-DD); PDFs keep the document house style
 * (DD.MM.YYYY) owned by the document-service.
 */
export function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

/** ISO date arithmetic in whole days (UTC-anchored, no DST surprises). */
export function shiftDay(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
