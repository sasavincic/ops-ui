"use client";

import { MonthNav } from "../components/month-nav";
import type { Story } from "./index";

function Nav() {
  return (
    <div className="min-h-80">
      <MonthNav month="2026-07" hrefPattern="?m={m}" className="mx-auto w-fit" />
    </div>
  );
}

export const stories: Story[] = [
  { name: "Closed", render: () => <Nav /> },
  { name: "Picker open", render: () => <Nav />, open: '[data-story] button[aria-haspopup="dialog"]' },
];
