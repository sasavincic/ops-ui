"use client";

import { Badge } from "../components/badge";
import type { BadgeVariant, StatusIconName } from "../types";
import type { Story } from "./index";
import { Row, Stack } from "./story-layout";

const SAMPLES: [BadgeVariant, StatusIconName, string][] = [
  ["neutral", "draft", "Draft"],
  ["success", "current", "Active"],
  ["warning", "clock", "Due soon"],
  ["danger", "problem", "Expired"],
  ["info", "send", "Sent"],
  ["neutral", "archive", "Archived"],
  ["neutral", "close", "Terminated"],
  ["success", "lock", "Final"],
];

export const stories: Story[] = [
  {
    name: "Variants",
    render: () => (
      <Stack>
        <Row label="Tinted (a status on the record it describes)">
          {SAMPLES.map(([variant, icon, label]) => (
            <Badge key={label} variant={variant} icon={icon}>
              {label}
            </Badge>
          ))}
        </Row>
        <Row label="Outline (the exception on a row)">
          {SAMPLES.map(([variant, icon, label]) => (
            <Badge key={label} variant={variant} icon={icon} appearance="outline">
              {label}
            </Badge>
          ))}
        </Row>
        <Row label="Default variant, title">
          <Badge icon="current" title="Since 01-08-2026">
            Current
          </Badge>
        </Row>
      </Stack>
    ),
  },
];
