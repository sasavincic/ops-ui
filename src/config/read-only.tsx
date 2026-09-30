"use client";

// The read-only scope (spec §6.2): ONE context, in the library. What a
// session may write is decided by the app; the kit only needs to know
// whether the subtree it renders in is read-only. Nothing here is a
// security boundary - every server action still checks - this is only what
// the UI OFFERS, so a read-only account never clicks its way into an error
// page. The library never names a permission area: an app's own WriteScope
// resolves its area and renders a ReadOnlyScope.

import { createContext, useContext } from "react";

/** Set by ReadOnlyScope: inside a read-only scope the session may not write. */
const ReadOnlyContext = createContext(false);

/**
 * Default-deny for a cluster of controls. Kit Buttons inside render nothing
 * unless marked readOnlySafe (a Copy, a Show all — anything that changes no
 * data); kit fields come up disabled. The scope PROVIDES its value, it does
 * not OR it with the parent: a nested readOnly={false} re-opens a subtree.
 */
export function ReadOnlyScope({
  readOnly,
  children,
}: {
  readOnly: boolean;
  children: React.ReactNode;
}) {
  return <ReadOnlyContext.Provider value={readOnly}>{children}</ReadOnlyContext.Provider>;
}

/** True when the surrounding ReadOnlyScope says this session cannot write. */
export function useReadOnlyScope(): boolean {
  return useContext(ReadOnlyContext);
}
