"use client";

import { BackLink } from "../components/back-link";
import type { Story } from "./index";
import { Row, Stack } from "./story-layout";

export const stories: Story[] = [
  {
    name: "Fallback",
    render: () => (
      <Stack>
        <Row label="With the list's label">
          <BackLink href="#workers" label="Workers" />
        </Row>
        <Row label="Without a label">
          <BackLink href="#workers" />
        </Row>
      </Stack>
    ),
  },
];
