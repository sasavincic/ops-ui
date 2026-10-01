"use client";

// The Tabs nav's accessible name (library 1.1.0, spec §12.4: optional strings.tabs, default
// "Tabs"). Tabs is server-safe (a server page passes `hrefFor`, a function no client component
// could receive), so it cannot read the kit config itself: it renders its links on the server
// and hands them to this client leaf, which only names the <nav>. The DOM is the 1.0 DOM.

import { useOpsUi } from "./provider";
import { EN_OPTIONAL_STRINGS } from "./strings";

export function TabsNav({ className, children }: { className?: string; children: React.ReactNode }) {
  const { strings } = useOpsUi();
  return (
    <nav className={className} aria-label={strings.tabs ?? EN_OPTIONAL_STRINGS.tabs}>
      {children}
    </nav>
  );
}
