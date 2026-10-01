"use client";

import { useState } from "react";
import { ActionIcon } from "../components/action-icon";
import { Grid } from "../components/grid";
import { Segmented } from "../components/segmented";
import { Stack as KitStack } from "../components/stack";
import type { Story } from "./index";
import { Row, Stack } from "./story-layout";

/**
 * 1.7.0: Workforce Ops' new-worker form. The control sits in a one-column form Grid on a phone,
 * whose automatic track grew to the control's whole width (the page scrolled sideways by 9px at
 * 375); the control now stays inside its row and scrolls inside itself.
 */
function InAFormGrid() {
  const [mode, setMode] = useState<"own" | "subcontractor" | "none">("own");
  return (
    <Grid as="form" gap={4} cols={2} from="sm" className="max-w-2xl">
      <div className="space-y-1.5 sm:col-span-2">
        <KitStack gap={2} className="min-w-0">
          <Segmented
            label="Employer"
            value={mode}
            onValueChange={setMode}
            options={[
              { value: "own", label: "Own employee" },
              { value: "subcontractor", label: "Subcontractor" },
              { value: "none", label: "Not employed yet, papers pending" },
            ]}
            className="mb-2 max-w-full"
          />
        </KitStack>
      </div>
    </Grid>
  );
}

function Controlled({ disabled }: { disabled?: boolean }) {
  const [value, setValue] = useState<"day" | "direction" | "site">("direction");
  return (
    <Segmented
      label="Group by"
      value={value}
      onValueChange={setValue}
      disabled={disabled}
      options={[
        { value: "day", label: "Day", icon: <ActionIcon name="calendar" /> },
        { value: "direction", label: "Direction", icon: <ActionIcon name="exchange" /> },
        { value: "site", label: "Worksite", icon: <ActionIcon name="list" /> },
      ]}
    />
  );
}

export const stories: Story[] = [
  {
    name: "Links and buttons",
    render: () => (
      <Stack>
        <Row label="Links (the choice lives in the URL)">
          <Segmented
            label="Horizon"
            value="14"
            options={[
              { value: "7", label: "7 days", href: "?h=7" },
              { value: "14", label: "14 days", href: "?h=14" },
              { value: "30", label: "30 days", href: "?h=30" },
            ]}
          />
        </Row>
        <Row label="Buttons (controlled)">
          <Controlled />
        </Row>
        <Row label="Disabled">
          <Controlled disabled />
        </Row>
      </Stack>
    ),
  },
  {
    name: "Wider than its row",
    render: () => (
      <div className="max-w-full">
        <Segmented
          label="Scope"
          value="all"
          options={[
            { value: "all", label: "Vse zahteve in napotitve", href: "?s=all" },
            { value: "open", label: "Samo odprte zahteve", href: "?s=open" },
            { value: "priced", label: "Delovišča s ceno", href: "?s=priced" },
            { value: "ended", label: "Končana delovišča", href: "?s=ended" },
          ]}
        />
      </div>
    ),
  },
  { name: "In a form grid", render: () => <InAFormGrid /> },
];
