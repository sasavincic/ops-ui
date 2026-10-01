"use client";

import { AppSwitcher } from "../components/app-switcher";
import type { Story } from "./index";

/** The app's own mark, as an app passes it: here a sidebar wordmark. */
function Mark() {
  return (
    <span className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold text-sidebar-fg-active">
      <span aria-hidden className="size-2.5 rounded-full bg-accent" />
      Workforce Ops
    </span>
  );
}

function Sidebar() {
  return (
    <div className="min-h-64 w-60 max-w-full rounded-container bg-sidebar p-3">
      <AppSwitcher current="workforce" mark={<Mark />} />
    </div>
  );
}

export const stories: Story[] = [
  { name: "Closed", render: () => <Sidebar /> },
  { name: "Open", render: () => <Sidebar />, open: '[data-story] button[aria-haspopup="menu"]' },
];
