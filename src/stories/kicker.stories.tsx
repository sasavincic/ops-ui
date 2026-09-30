"use client";

import { Kicker } from "../components/kicker";
import { StatusIcon } from "../components/status-icon";
import type { Story } from "./index";
import { Stack } from "./story-layout";

export const stories: Story[] = [
  {
    name: "Variants",
    render: () => (
      <Stack>
        <Kicker>To site</Kicker>
        <Kicker icon={<StatusIcon name="clock" />}>Arriving</Kicker>
        <Kicker as="h3" icon={<StatusIcon name="archive" />}>
          Archived records
        </Kicker>
      </Stack>
    ),
  },
];
