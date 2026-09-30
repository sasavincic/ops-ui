"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { backTarget, type NavTrailState } from "@/domain/nav-trail";
import { trackNavigation } from "@/lib/navigation-history";

let snapshot: NavTrailState | null = null;
let returning = false;
let notificationQueued = false;
const listeners = new Set<() => void>();
function publish(next: NavTrailState | null) {
  snapshot = next;
  returning = false;
  // Next commits history in an insertion effect, where React must not be
  // notified synchronously. The snapshot is current immediately; subscribers
  // update just after that commit, with rapid writes coalesced.
  if (!notificationQueued) {
    notificationQueued = true;
    queueMicrotask(() => {
      notificationQueued = false;
      listeners.forEach((listener) => listener());
    });
  }
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const getSnapshot = () => snapshot;
const getServerSnapshot = () => null;

/** Mounted once in the app shell; no session-wide URL log to go stale. */
export function NavTrail() {
  useEffect(() => trackNavigation(window, publish), []);
  return null;
}

export function useReturnNavigation(fallback: string) {
  const pathname = usePathname();
  const trail = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const destination = backTarget(trail, pathname, fallback);
  return {
    href: destination.url,
    contextual: destination.url !== fallback,
    onNavigate(e: { preventDefault: () => void }) {
      // onNavigate only runs for ordinary same-tab navigation. Cmd/Ctrl-click,
      // middle-click and opening the destination in a new tab stay native.
      if (destination.delta === null) return;
      e.preventDefault();
      if (returning) return;
      returning = true;
      window.history.go(destination.delta);
    },
  };
}
