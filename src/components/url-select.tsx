"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/**
 * A filter that lives in the URL: picking a value rewrites one query
 * parameter and keeps the others, replacing the history entry (view state
 * is not a page — DESIGN.md → Toggles). `reset` names parameters a new
 * choice makes meaningless (a page number).
 */
export function UrlSelect({
  param,
  value,
  options,
  label,
  reset = [],
  className,
}: {
  param: string;
  value: string;
  options: { value: string; label: string }[];
  label: string;
  reset?: string[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <Select
      aria-label={label}
      title={label}
      value={value}
      readOnlySafe
      className={cn("h-8 w-auto max-w-56 text-detail lg:text-detail", className)}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString());
        if (e.target.value) next.set(param, e.target.value);
        else next.delete(param);
        for (const r of reset) next.delete(r);
        const query = next.toString();
        router.replace(query ? `${pathname}?${query}` : pathname);
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
