"use client";

import { Stack } from "../components/stack";
import type { Gap } from "../lib/gap";
import type { Story } from "./index";
import { Row, Stack as StoryColumn } from "./story-layout";

const GAPS: Gap[] = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6];

function Bar() {
  return <span className="block h-3 w-16 rounded-control border border-border bg-surface-raised" />;
}

export const stories: Story[] = [
  {
    name: "Gaps",
    render: () => (
      <StoryColumn>
        <Row label="gap 0.5 to 6" className="items-start">
          {GAPS.map((gap) => (
            <Stack key={gap} gap={gap}>
              <Bar />
              <Bar />
              <Bar />
            </Stack>
          ))}
        </Row>
        <Row label="As a list">
          <Stack as="ul" gap={1} className="text-sm text-ink">
            <li>First</li>
            <li>Second</li>
            <li>Third</li>
          </Stack>
        </Row>
      </StoryColumn>
    ),
  },
];
