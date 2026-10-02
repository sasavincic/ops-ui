"use client";

import { Text } from "../components/text";
import type { Story } from "./index";
import { Row, Stack } from "./story-layout";

export const stories: Story[] = [
  {
    name: "Sizes and tones",
    render: () => (
      <Stack>
        <Row label="Sizes">
          <Text size="body">Body 14px: table cells and data</Text>
          <Text size="detail">Detail 13px: the supporting line</Text>
          <Text size="micro">Micro 11px</Text>
        </Row>
        <Row label="Tones">
          <Text tone="ink">Ink</Text>
          <Text tone="secondary">Secondary</Text>
          <Text tone="muted">Muted</Text>
          <Text tone="warning">Warning</Text>
          <Text tone="danger">Danger</Text>
          <Text tone="success">Success</Text>
        </Row>
        <Row label="Recipes" className="items-start">
          <div className="flex flex-col gap-1">
            <Text weight="medium" tone="ink">
              Barišić, Josip
            </Text>
            <Text as="p" size="detail" tone="muted">
              Welder TIG (141) · Augsburg · MASC
            </Text>
            <Text as="p" size="detail" tone="secondary">
              Since 01-08-2026, 14 days on site
            </Text>
          </div>
        </Row>
      </Stack>
    ),
  },
  {
    name: "Weights and flags",
    render: () => (
      <Stack>
        <Row label="Weights">
          <Text weight="normal">Normal</Text>
          <Text weight="medium">Medium</Text>
          <Text weight="semibold">Semibold</Text>
        </Row>
        <Row label="Mono, block, truncate" className="items-start">
          <Text mono tone="ink">
            QT-MAXS-LM-26023
          </Text>
          <span className="w-48">
            <Text>First line</Text>
            <Text block size="detail" tone="muted">
              A block second line
            </Text>
          </span>
          <Text as="div" truncate size="detail" tone="muted" className="w-40">
            A long line that runs out of room and ends in an ellipsis
          </Text>
        </Row>
      </Stack>
    ),
  },
  {
    name: "Nowrap and tabular",
    render: () => (
      <Stack>
        <Row label="nowrap (1.6.0): the date never breaks" className="items-start">
          <span className="w-24 text-detail text-ink-secondary">
            Due <Text size="detail" nowrap>01-10-2026</Text>
          </span>
          <Text mono size="detail" nowrap>
            VA-2026-0042
          </Text>
        </Row>
        <Row label="tabular (1.6.0): figures line up row under row" className="block">
          <div className="flex w-40 flex-col items-end">
            <Text tabular>1,111.11</Text>
            <Text tabular>8,888.88</Text>
            <Text tabular size="detail" tone="muted">
              12,5 h
            </Text>
          </div>
        </Row>
      </Stack>
    ),
  },
  {
    name: "As a heading",
    render: () => (
      <Stack>
        <Row label="h2 / h3 / h4 in a Text look" className="block">
          <Text as="h2" weight="semibold" block>
            Cut list
          </Text>
          <Text as="h3" size="detail" weight="medium" tone="secondary" block>
            Assembly 3 · 14 parts
          </Text>
          <Text as="h4" size="micro" tone="muted" block>
            Drawing 26-118-03
          </Text>
        </Row>
      </Stack>
    ),
  },
];
