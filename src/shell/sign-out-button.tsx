"use client";

import { useOpsUi } from "../config/provider";
import { EN_OPTIONAL_STRINGS } from "../config/strings";
import { cn } from "../lib/cn";

/**
 * The account block's quiet "Sign out" (both apps' shell/sign-out-button.tsx). The library
 * knows no auth: `onSignOut` is the app's (sign out with its auth client, then go to its
 * sign-in page).
 */
export function SignOutButton({ onSignOut, className }: { onSignOut: () => void | Promise<void>; className?: string }) {
  const { strings } = useOpsUi();
  const words = strings.shell ?? EN_OPTIONAL_STRINGS.shell;
  return (
    <button
      onClick={async () => {
        await onSignOut();
      }}
      className={cn(
        "text-xs text-sidebar-fg underline-offset-2 transition-colors duration-150 hover:text-sidebar-fg-active hover:underline",
        className
      )}
    >
      {words.signOut}
    </button>
  );
}
