"use client";

import { PageHelp } from "../components/page-help";
import type { Story } from "./index";

function Help() {
  return (
    <div className="flex min-h-72 max-w-2xl items-start justify-end">
      <PageHelp label="About this list">
        <p>The Attention column lists what needs doing on each record.</p>
        <p>Red is wrong now; amber is coming or missing.</p>
      </PageHelp>
    </div>
  );
}

export const stories: Story[] = [
  { name: "Closed", render: () => <Help /> },
  { name: "Open", render: () => <Help />, open: '[data-story] button[aria-label="About this list"]' },
];
