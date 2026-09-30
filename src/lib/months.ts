// L2 import: shiftMonth, copied verbatim from fina-ops origin/main (80828fc) src/domain/months.ts.

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}
