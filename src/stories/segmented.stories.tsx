"use client";

import { useState } from "react";
import { ActionIcon } from "../components/action-icon";
import { Segmented } from "../components/segmented";
import type { Story } from "./index";
import { Row, Stack } from "./story-layout";

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
];
