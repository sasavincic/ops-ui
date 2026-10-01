/**
 * Where a floating panel anchored to a field goes (2026-09-30, Saša on his
 * phone: clearing "Last day employed" did nothing — the calendar opened below
 * the field, fitted neither below nor above, and its Today / Clear footer sat
 * under the bottom of the screen; with no keyboard on touch, Clear was the
 * only way to empty the field).
 *
 * Below when it fits, else above when it fits, else as far down as it can go
 * while staying ENTIRELY on screen — covering its own field is better than
 * hiding its footer. A panel taller than the screen starts at the margin and
 * is given `maxHeight` so it scrolls.
 */
export function floatingTop(
  field: { top: number; bottom: number },
  panelHeight: number,
  viewportHeight: number,
  gap = 4,
  margin = 8
): { top: number; maxHeight: number | null } {
  const below = field.bottom + gap;
  const above = field.top - gap - panelHeight;
  const room = viewportHeight - 2 * margin;
  if (panelHeight > room) return { top: margin, maxHeight: room };
  if (below + panelHeight <= viewportHeight - margin) return { top: below, maxHeight: null };
  if (above >= margin) return { top: above, maxHeight: null };
  return { top: Math.max(margin, viewportHeight - margin - panelHeight), maxHeight: null };
}
