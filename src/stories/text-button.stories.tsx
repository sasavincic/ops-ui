"use client";

import { ReadOnlyScope } from "../config/read-only";
import { Text } from "../components/text";
import { TextButton } from "../components/text-button";
import type { Story } from "./index";
import { Row, Stack } from "./story-layout";

export const stories: Story[] = [
  {
    name: "Variants",
    render: () => (
      <Stack>
        <Row label="quiet (size, tone)">
          <TextButton type="button" variant="quiet" size="detail" tone="muted">
            + alternative rate
          </TextButton>
          <TextButton type="button" variant="quiet" tone="secondary">
            Show 3 more
          </TextButton>
        </Row>
        <Row label="underline">
          <TextButton type="button" variant="underline" size="detail" tone="danger" className="hover:opacity-80">
            Delete lead
          </TextButton>
        </Row>
        <Row label="plain, primary, strong">
          <TextButton type="button" variant="plain" size="micro" tone="muted">
            Replace
          </TextButton>
          <TextButton type="button" variant="primary" size="detail">
            Add a line
          </TextButton>
          <TextButton type="button" variant="strong">
            Fuel cards
          </TextButton>
        </Row>
        <Row label="muted (sign-in pages)">
          <TextButton type="button" variant="muted" size="detail" className="py-2 hover:underline">
            Use a backup code instead
          </TextButton>
        </Row>
        <Row label="inside text">
          <Text as="p" size="detail" tone="secondary">
            No price linked yet. <TextButton type="button" variant="quiet">Link a quote</TextButton> to plan from it.
          </Text>
        </Row>
        <Row label="in a read-only scope: only readOnlySafe stays">
          <ReadOnlyScope readOnly>
            <TextButton type="button" variant="quiet" size="detail">
              Remove
            </TextButton>
            <TextButton type="button" variant="quiet" size="detail" readOnlySafe>
              Show all
            </TextButton>
          </ReadOnlyScope>
        </Row>
      </Stack>
    ),
  },
];
