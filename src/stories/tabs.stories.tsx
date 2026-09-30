"use client";

import { Tabs } from "../components/tabs";
import type { Story } from "./index";
import { Stack } from "./story-layout";

export const stories: Story[] = [
  {
    name: "Counts and attention",
    render: () => (
      <Stack className="max-w-3xl">
        <Tabs
          active="compliance"
          hrefFor={(key) => `?tab=${key}`}
          items={[
            { key: "overview", label: "Overview" },
            { key: "employment", label: "Employment", count: 2 },
            { key: "compliance", label: "Compliance", count: 5, attention: 1, attentionTone: "danger", attentionLabel: "1 expired" },
            { key: "skills", label: "Skills", count: 3, attention: 2, attentionTone: "warning", attentionLabel: "2 due soon" },
            { key: "hours", label: "Hours", attention: 4, attentionTone: "warning", attentionLabel: "4 periods open" },
            { key: "pay", label: "Pay", count: 0 },
            { key: "history", label: "Change log", count: 128 },
          ]}
        />
        <Tabs
          active="board"
          hrefFor={(key) => `?view=${key}`}
          items={[
            { key: "board", label: "Board", count: 12 },
            { key: "grid", label: "Gap grid" },
            { key: "flightboard", label: "Flightboard", attention: 3, attentionTone: "danger" },
          ]}
        />
      </Stack>
    ),
  },
];
