"use client";

import Link from "next/link";
import { useReturnNavigation } from "@/components/shell/nav-trail";
import { useDict } from "@/i18n/client";

/** Cancel and Back share the same return behavior without adding a visit. */
export function ReturnLink({ href, onNavigate, ...props }: Omit<React.ComponentProps<typeof Link>, "href"> & { href: string }) {
  const navigation = useReturnNavigation(href);
  return <Link {...props} href={navigation.href} replace onNavigate={(e) => {
    let prevented = false;
    onNavigate?.({ preventDefault: () => { prevented = true; e.preventDefault(); } });
    if (!prevented) navigation.onNavigate(e);
  }} />;
}

export function BackLink({ href, label, onBackClick }: {
  href: string;
  label?: string;
  onBackClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const t = useDict();
  const navigation = useReturnNavigation(href);
  return (
    <Link
      href={navigation.href}
      replace
      onNavigate={navigation.onNavigate}
      onClick={(e) => {
        if (!e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) onBackClick?.(e);
      }}
      className="mb-1 inline-block text-detail text-ink-muted transition-colors duration-150 hover:text-ink"
    >
      ← {navigation.contextual ? t.common.back : (label ?? t.common.back)}
    </Link>
  );
}
