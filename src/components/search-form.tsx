import { SearchInput } from "@/components/ui/search-input";
import { cn } from "@/lib/utils";

/**
 * A list's search box as a plain GET form: Enter submits, the query lands
 * in the URL (shareable, survives a reload) and the other filters ride
 * along as hidden fields. A server component — no client state to keep in
 * step with the address bar.
 */
export function SearchForm({
  action,
  value,
  placeholder,
  keep,
  className,
}: {
  action: string;
  value: string;
  placeholder: string;
  /** Other query parameters to carry through the submit. */
  keep: Record<string, string | null | undefined>;
  className?: string;
}) {
  return (
    <form method="get" action={action} role="search" className={cn("w-full sm:w-72", className)}>
      {Object.entries(keep).map(([name, v]) => (v ? <input key={name} type="hidden" name={name} value={v} /> : null))}
      <SearchInput name="q" defaultValue={value} placeholder={placeholder} aria-label={placeholder} className="h-8" />
    </form>
  );
}
