"use client";

import { Heading } from "../components/heading";
import { Text } from "../components/text";
import type { Story } from "./index";
import { Stack } from "./story-layout";

export const stories: Story[] = [
  {
    name: "Levels",
    render: () => (
      <Stack>
        <Heading level="title">Sign in</Heading>
        <div className="flex flex-col gap-2">
          <Heading level="section">Recent lines</Heading>
          <Text as="p" size="detail" tone="secondary">
            A section of a page or a card.
          </Text>
        </div>
        <div className="flex flex-col gap-2">
          <Heading level="subsection">Contact</Heading>
          <Text as="p" size="detail" tone="secondary">
            A group inside a section or a sheet.
          </Text>
        </div>
        <Heading level="section" as="h3">
          A section heading rendered as h3
        </Heading>
      </Stack>
    ),
  },
];
