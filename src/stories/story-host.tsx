"use client";

import { createContext, useContext } from "react";
import { ActionIconScope } from "../components/action-icon";
import { Toaster } from "../components/toast";

// The frame every story renders in: the gallery's StoryView and each app's /dev/kit view wrap the
// stories in it, so a story looks the same in both places. Not a kit component (no app screen
// imports it).

const PageToaster = createContext(false);

/**
 * - `ActionIconScope enabled`: the stories show the kit's icons wherever they are mounted. An app
 *   may switch ActionIcon off for its routes (Workforce Ops' RouteActionIconScope), and /dev/kit is
 *   one of those routes; a story must still exercise the icons it exists to show.
 * - `pageToaster`: the page already mounts a `<Toaster />` (every app's root layout does), so the
 *   stories that need one leave theirs out: two viewports over one store would draw every toast
 *   twice, with two `role="region"` stacks. The gallery mounts none, so it leaves this off.
 */
export function StoryHost({ pageToaster = false, children }: { pageToaster?: boolean; children: React.ReactNode }) {
  return (
    <ActionIconScope enabled>
      <PageToaster.Provider value={pageToaster}>{children}</PageToaster.Provider>
    </ActionIconScope>
  );
}

/** A story's own Toaster, left out when the page already has one (StoryHost `pageToaster`). */
export function StoryToaster() {
  return useContext(PageToaster) ? null : <Toaster />;
}
