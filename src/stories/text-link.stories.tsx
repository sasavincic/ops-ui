"use client";

import { Text } from "../components/text";
import { TextLink } from "../components/text-link";
import type { Story } from "./index";
import { Row, Stack } from "./story-layout";

export const stories: Story[] = [
  {
    name: "Variants",
    render: () => (
      <Stack>
        <Row label="quiet">
          <Text size="detail" tone="secondary">
            Won via <TextLink variant="quiet" href="#lead">Client Operations</TextLink>
          </Text>
        </Row>
        <Row label="underline">
          <Text tone="secondary">
            <TextLink variant="underline" href="#site">
              Augsburg · MASC
            </TextLink>
          </Text>
        </Row>
        <Row label="primary">
          <TextLink variant="primary" href="#all">
            All statements
          </TextLink>
          <TextLink variant="primary" size="detail" href="#more">
            Show all 12
          </TextLink>
        </Row>
        <Row label="plain">
          <TextLink variant="plain" href="#counterparty">
            Kraftwerk Bau GmbH
          </TextLink>
        </Row>
        <Row label="strong">
          <TextLink variant="strong" href="#worker">
            Barišić, Josip
          </TextLink>
        </Row>
        <Row label="external">
          <TextLink variant="primary" href="mailto:office@example.com">
            office@example.com
          </TextLink>
        </Row>
      </Stack>
    ),
  },
];
