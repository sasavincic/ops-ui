"use client";

import { ActionIcon } from "../components/action-icon";
import { StatusIcon } from "../components/status-icon";
import { Tag } from "../components/tag";
import type { Story } from "./index";
import { Row } from "./story-layout";

export const stories: Story[] = [
  {
    name: "Variants",
    render: () => (
      <Row label="Facts that are not statuses">
        <Tag icon={<ActionIcon name="bed" />}>Accommodation included</Tag>
        <Tag>Welder TIG (141)</Tag>
        <Tag tone="admin" icon={<StatusIcon name="key" />}>
          Admin tools
        </Tag>
        <Tag title="Vantus · Agency work — Augsburg · MASC" className="max-w-40 overflow-hidden text-ellipsis">
          Vantus · Agency work — Augsburg · MASC
        </Tag>
      </Row>
    ),
  },
];
