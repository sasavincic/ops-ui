"use client";

import { ReadOnlyScope } from "../config/read-only";
import { Tag } from "../components/tag";
import { TagRemove } from "../components/tag-remove";
import { Text } from "../components/text";
import type { Story } from "./index";
import { Row, Stack } from "./story-layout";

export const stories: Story[] = [
  {
    name: "In a tag",
    render: () => (
      <Stack>
        <Row label="chips with a remove">
          <Tag className="pr-1">
            Kraftwerk Bau GmbH
            <TagRemove label="Remove Kraftwerk Bau GmbH" />
          </Tag>
          <Tag className="pr-1">
            <Text tone="muted">Pays</Text>
            VA-2026-0041
            <TagRemove label="Remove invoice VA-2026-0041" />
          </Tag>
          <Tag className="max-w-48 min-w-0 pr-1" title="Worksite: Augsburg · MASC, a long name">
            <Text tone="muted" className="shrink-0">Worksite</Text>
            <span className="truncate">Augsburg · MASC, a long name</span>
            <TagRemove label="Remove Augsburg · MASC" />
          </Tag>
        </Row>
        <Row label="in a read-only scope: the remove is gone">
          <ReadOnlyScope readOnly>
            <Tag className="pr-1">
              Kraftwerk Bau GmbH
              <TagRemove label="Remove Kraftwerk Bau GmbH" />
            </Tag>
          </ReadOnlyScope>
        </Row>
      </Stack>
    ),
  },
];
