import { cn } from "../lib/cn";
import type { StatusIconName } from "../types";

export type { StatusIconName };

/**
 * One small line-icon vocabulary for read-only state indicators — ONE
 * glyph per meaning (status doctrine 2026-09-25, §5): current = circle-dot,
 * check = confirmed, lock = finalized, draft = pencil, ended = flag,
 * inactive = pause, archive = archive box, clock = planned / coming,
 * problem = ring-with-bar (wrong now), question = unknown, alert = triangle
 * (a blocking condition — deploy-dialog prerequisites only), close = a
 * settled negative outcome, send = sent, key = privilege, info = a notice
 * about what an action did (toasts).
 */
const paths: Record<StatusIconName, React.ReactNode> = {
  current: <><circle cx="8" cy="8" r="5.5" /><circle cx="8" cy="8" r="2" fill="currentColor" stroke="none" /></>,
  check: <path d="m3 8 3 3 7-7" />,
  clock: <><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.5 1.5" /></>,
  alert: <><path d="M8 2 14.5 14h-13L8 2Z" /><path d="M8 6v3m0 2.5v.1" /></>,
  problem: <><circle cx="8" cy="8" r="6" /><path d="M8 5v3.5M8 11h.01" /></>,
  question: <><circle cx="8" cy="8" r="6" /><path d="M6 6.5a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.2V10M8 12h.01" /></>,
  close: <path d="m4 4 8 8m0-8-8 8" />,
  draft: <path d="m10.5 2.5 3 3-8 8-4 1 1-4zM9 4l3 3" />,
  ended: <path d="M3 14V2h9l-2 3.5L12 9H3" />,
  inactive: <path d="M5 3v10M11 3v10" />,
  archive: <><rect x="2" y="3" width="12" height="3" rx="0.5" /><path d="M3 6v7h10V6M6.5 9h3" /></>,
  key: <><circle cx="5.5" cy="5.5" r="3.5" /><path d="m8 8 6 6m-3-3 2-2" /></>,
  lock: <><rect x="3" y="7" width="10" height="7" rx="1" /><path d="M5 7V5a3 3 0 0 1 6 0v2" /></>,
  send: <><path d="m2 3 12 5-12 5 2-5-2-5Z" /><path d="M4 8h10" /></>,
  minus: <path d="M3 8h10" />,
  info: <><circle cx="8" cy="8" r="6" /><path d="M8 7.5V11M8 5h.01" /></>,
};

export function StatusIcon({ name, className }: { name: StatusIconName; className?: string }) {
  return <svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={cn("shrink-0", className)}>{paths[name]}</svg>;
}
