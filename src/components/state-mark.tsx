import { Badge } from "./badge";
import type { StateMarkSpec } from "../types";

/**
 * The outlined status pill: the same status as a Badge, worn where the
 * ORDINARY state is silent — a list row, a child row, a search result —
 * so only the exception carries a mark. Any status variant (an outlined
 * Amended is blue, a Terminated slate).
 */
export type { StateMarkSpec };

export function StateMark({
  tone, icon, className, children, title,
}: StateMarkSpec & { className?: string; title?: string; children: React.ReactNode }) {
  return <Badge variant={tone} icon={icon} appearance="outline" className={className} title={title}>{children}</Badge>;
}
